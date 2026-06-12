import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { ethers } from "ethers";
import { v4 as uuid } from "uuid";
import { query, hasDatabase } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const app = express();
const port = process.env.PORT || 4000;
const jwtSecret = process.env.JWT_SECRET || "development-secret";
const provider = process.env.SEPOLIA_RPC_URL
  ? new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  : null;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

const trackedPriceCoins = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", priceKey: "ethereum", fallbackUsd: 2461.85, fallbackChange24h: 2.35 },
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", priceKey: "bitcoin", fallbackUsd: 68235.4, fallbackChange24h: 1.15 },
  { symbol: "USDC", name: "USD Coin", coingeckoId: "usd-coin", priceKey: "usdCoin", fallbackUsd: 1, fallbackChange24h: 0.01 },
  { symbol: "USDT", name: "Tether", coingeckoId: "tether", priceKey: "tether", fallbackUsd: 1, fallbackChange24h: 0.0 },
  { symbol: "DAI", name: "Dai", coingeckoId: "dai", priceKey: "dai", fallbackUsd: 1, fallbackChange24h: 0.01 },
  { symbol: "BNB", name: "BNB", coingeckoId: "binancecoin", priceKey: "binancecoin", fallbackUsd: 615.4, fallbackChange24h: 0.85 },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana", priceKey: "solana", fallbackUsd: 145.25, fallbackChange24h: 2.1 },
  { symbol: "MATIC", name: "Polygon", coingeckoId: "matic-network", priceKey: "maticNetwork", fallbackUsd: 0.091783, fallbackChange24h: -0.2577 },
  { symbol: "XRP", name: "XRP", coingeckoId: "ripple", priceKey: "ripple", fallbackUsd: 1.42, fallbackChange24h: -0.45 },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", priceKey: "cardano", fallbackUsd: 0.48, fallbackChange24h: 0.62 }
];

let trackedCoinsInitialized = false;
let priceCache = {
  expiresAt: 0,
  data: toPricePayload()
};

let marketCache = {
  expiresAt: 0,
  data: [
    {
      id: "bitcoin",
      rank: 1,
      name: "Bitcoin",
      symbol: "BTC",
      image: "/coin-icons/btc.svg",
      price: 77889.73,
      change1h: -0.12,
      change24h: 0.33,
      change7d: 2.44,
      marketCap: 1559432744114,
      volume24h: 16990453789,
      circulatingSupply: 20020000,
      sparkline: [74210, 74880, 74620, 75120, 75940, 75660, 76280, 77120, 76870, 77510, 77889]
    },
    {
      id: "ethereum",
      rank: 2,
      name: "Ethereum",
      symbol: "ETH",
      image: "/coin-icons/eth.svg",
      price: 2331.07,
      change1h: -0.02,
      change24h: 0.62,
      change7d: -0.46,
      marketCap: 281335316913,
      volume24h: 7473444364,
      circulatingSupply: 120680000,
      sparkline: [2360, 2335, 2348, 2329, 2310, 2324, 2308, 2321, 2338, 2326, 2331]
    },
    {
      id: "tether",
      rank: 3,
      name: "Tether",
      symbol: "USDT",
      image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
      price: 1,
      change1h: 0,
      change24h: 0,
      change7d: 0.02,
      marketCap: 189806285547,
      volume24h: 88905402097,
      circulatingSupply: 189790000000,
      sparkline: [1, 1.001, 0.999, 1, 1.002, 1, 0.999, 1, 1.001, 1, 1]
    },
    {
      id: "ripple",
      rank: 4,
      name: "XRP",
      symbol: "XRP",
      image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
      price: 1.42,
      change1h: -0.23,
      change24h: -0.45,
      change7d: -1.17,
      marketCap: 87884822439,
      volume24h: 1152192575,
      circulatingSupply: 61680000000,
      sparkline: [1.46, 1.45, 1.44, 1.43, 1.41, 1.42, 1.4, 1.42, 1.43, 1.42, 1.42]
    }
  ]
};

const priceKeyByCoinGeckoId = {
  ethereum: "ethereum",
  bitcoin: "bitcoin",
  "usd-coin": "usdCoin",
  tether: "tether",
  dai: "dai",
  binancecoin: "binancecoin",
  "matic-network": "maticNetwork",
  "polygon-ecosystem-token": "maticNetwork",
  solana: "solana",
  ripple: "ripple",
  cardano: "cardano"
};
const minerRewardRate = 0.001;
const miningRewardAddress = "0x0000000000000000000000000000000000000000";

function toPricePayload(priceRows = []) {
  const bySymbol = new Map(priceRows.map((row) => [row.symbol, row]));
  const payload = {};
  for (const coin of trackedPriceCoins) {
    const current = bySymbol.get(coin.symbol);
    payload[coin.priceKey] = {
      usd: Number(current?.price_usd ?? coin.fallbackUsd),
      usd_24h_change: Number(current?.change_24h ?? coin.fallbackChange24h)
    };
  }
  return payload;
}

function hourBucket(date = new Date()) {
  const utc = new Date(date);
  utc.setUTCMinutes(0, 0, 0);
  return utc.toISOString();
}

async function ensureTrackedCoins() {
  if (!hasDatabase || trackedCoinsInitialized) return;
  const valuesSql = trackedPriceCoins
    .map((_, idx) => {
      const base = idx * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    })
    .join(", ");
  const params = trackedPriceCoins.flatMap((coin) => [coin.symbol, coin.name, coin.coingeckoId]);
  await query(
    `insert into tracked_coins (symbol, name, coingecko_id)
     values ${valuesSql}
     on conflict (symbol) do update
       set name = excluded.name,
           coingecko_id = excluded.coingecko_id,
           is_active = true`,
    params
  );
  trackedCoinsInitialized = true;
}

function tokenFor(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role || "user" }, jwtSecret, { expiresIn: "7d" });
}

function cleanEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function validateName(name = "") {
  const value = String(name).trim();
  if (value.length < 2) return "Full name must be at least 2 characters";
  if (value.length > 120) return "Full name must be 120 characters or less";
  return "";
}

function validateEmail(email = "") {
  const value = cleanEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
  if (value.length > 180) return "Email must be 180 characters or less";
  return "";
}

function validatePassword(password = "") {
  const value = String(password);
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Password must include letters and numbers";
  return "";
}

function currentUserId(req) {
  return req.user?.sub || req.user?.id;
}

function isAdmin(req) {
  return req.user?.role === "admin";
}

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = header.replace("Bearer ", "");
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: "Admin access required" });
  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: hasDatabase, blockchain: Boolean(provider) });
});

app.post("/api/users/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");
  const errors = [validateName(name), validateEmail(email), validatePassword(password)].filter(Boolean);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuid();
    const wallet = ethers.Wallet.createRandom();
    const walletId = uuid();
    await query(
      "insert into users (id, name, email, role, password_hash) values ($1, $2, $3, 'user', $4)",
      [userId, name, email, passwordHash]
    );
    await query(
      "insert into wallets (id, user_id, address, network, encrypted_private_key) values ($1, $2, $3, $4, $5)",
      [walletId, userId, wallet.address, "sepolia", wallet.privateKey]
    );
    await query(
      `insert into wallet_balances (id, wallet_id, asset_id, balance)
       select gen_random_uuid(), $1, id, 0 from coin_assets where is_active = true
       on conflict (wallet_id, asset_id) do nothing`,
      [walletId]
    );
    await query(
      `insert into notifications (id, user_id, type, title, message)
     values ($1,$2,'login','Account Created','Your CryptoWallet account was created successfully.')`,
      [uuid(), userId]
    );
    const user = { id: userId, name, email, role: "user", walletAddress: wallet.address, profileImage: "" };
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email is already in use" });
    throw error;
  }
});

app.post("/api/users/login", async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");
  const errors = [validateEmail(email), password ? "" : "Password is required"].filter(Boolean);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });

  const result = await query(
    `select u.id, u.name, u.email, u.role, u.password_hash, u.profile_image, w.address as wallet_address
     from users u left join wallets w on w.user_id = u.id
     where u.email = $1 limit 1`,
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role || "user", walletAddress: user.wallet_address, profileImage: user.profile_image };
  await query(
    `insert into notifications (id, user_id, type, title, message)
     values ($1,$2,'login','New Device Login','A sign in was completed for your CryptoWallet account.')`,
    [uuid(), user.id]
  );
  res.json({ user: payload, token: tokenFor(payload) });
});

app.get("/api/users/me", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const userId = currentUserId(req);
  const result = await query(
    `select u.id, u.name, u.email, u.role, u.profile_image, w.address as wallet_address
     from users u left join wallets w on w.user_id = u.id
     where u.id = $1 limit 1`,
    [userId]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "User not found" });
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role || "user", walletAddress: user.wallet_address, profileImage: user.profile_image }
  });
});

app.put("/api/users/me", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const userId = currentUserId(req);
  const name = String(req.body.name || "").trim();
  const email = cleanEmail(req.body.email);
  const { oldPassword, password, confirmPassword } = req.body;
  const profileImage = Object.prototype.hasOwnProperty.call(req.body, "profileImage") ? String(req.body.profileImage || "") : null;
  const errors = [validateName(name), validateEmail(email)].filter(Boolean);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  if (profileImage && !profileImage.startsWith("data:image/")) {
    return res.status(400).json({ error: "Profile image must be an image data URL" });
  }
  if (profileImage && profileImage.length > 1_500_000) {
    return res.status(400).json({ error: "Profile image is too large" });
  }
  const params = [userId, name, email, profileImage];
  let passwordSql = "";
  if (password) {
    if (!oldPassword) return res.status(400).json({ error: "Current password is required" });
    if (password !== confirmPassword) return res.status(400).json({ error: "New passwords do not match" });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    const currentResult = await query("select password_hash from users where id = $1 limit 1", [userId]);
    if (!currentResult.rows[0] || !(await bcrypt.compare(oldPassword, currentResult.rows[0].password_hash))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    params.push(passwordHash);
    passwordSql = ", password_hash = $5";
  }
  try {
    const result = await query(
      `update users
       set name = $2,
           email = $3,
           profile_image = case when $4::text is null then profile_image else nullif($4::text, '') end,
           updated_at = now() ${passwordSql}
       where id = $1
       returning id, name, email, role, profile_image`,
      params
    );
    const walletResult = await query("select address from wallets where user_id = $1 limit 1", [userId]);
    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        profileImage: user.profile_image,
        walletAddress: walletResult.rows[0]?.address || ""
      }
    });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email is already in use" });
    throw error;
  }
});

app.get("/api/admin/overview", auth, requireAdmin, async (_req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const [usersResult, txResult, monthlyResult, volumeResult] = await Promise.all([
    query("select count(*)::int as total_users from users", []),
    query(
      `select
         count(*)::int as total_transactions,
         count(*) filter (where status = 'Pending')::int as pending_transactions,
         count(*) filter (where status = 'Confirmed')::int as confirmed_transactions
       from transactions`,
      []
    ),
    query(
      `with series as (
         select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month')::date as month
       ),
       joined as (
         select s.month,
                coalesce(count(t.id), 0)::int as transactions_count,
                coalesce(sum(t.usd_value), 0)::numeric(18,2) as volume_usd
         from series s
         left join transactions t on date_trunc('month', t.created_at)::date = s.month
         group by s.month
       )
       select month, transactions_count, volume_usd
       from joined
       order by month`,
      []
    ),
    query(
      `select
         coalesce(sum(usd_value) filter (where status = 'Confirmed'), 0)::numeric(18,2) as confirmed_volume_usd,
         coalesce(sum(usd_value) filter (where status = 'Pending'), 0)::numeric(18,2) as pending_volume_usd
       from transactions`,
      []
    )
  ]);

  res.json({
    totalUsers: Number(usersResult.rows[0]?.total_users || 0),
    totalTransactions: Number(txResult.rows[0]?.total_transactions || 0),
    pendingTransactions: Number(txResult.rows[0]?.pending_transactions || 0),
    confirmedTransactions: Number(txResult.rows[0]?.confirmed_transactions || 0),
    confirmedVolumeUsd: Number(volumeResult.rows[0]?.confirmed_volume_usd || 0),
    pendingVolumeUsd: Number(volumeResult.rows[0]?.pending_volume_usd || 0),
    monthly: monthlyResult.rows.map((row) => ({
      month: row.month,
      transactions: Number(row.transactions_count || 0),
      volumeUsd: Number(row.volume_usd || 0)
    }))
  });
});

app.get("/api/admin/users", auth, requireAdmin, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 15)));
  const offset = (page - 1) * pageSize;
  const search = String(req.query.search || "").trim().toLowerCase();
  const searchLike = `%${search}%`;

  const [countResult, rowsResult] = await Promise.all([
    query(
      `select count(*)::int as total
       from users u
       where ($1 = '' or lower(u.name) like $2 or lower(u.email) like $2)`,
      [search, searchLike]
    ),
    query(
      `select
         u.id,
         u.name,
         u.email,
         u.role,
         u.profile_image,
         u.created_at,
         w.address as wallet_address,
         coalesce(count(t.id), 0)::int as transactions_count
       from users u
       left join wallets w on w.user_id = u.id
       left join transactions t on t.user_id = u.id
       where ($1 = '' or lower(u.name) like $2 or lower(u.email) like $2)
       group by u.id, w.address
       order by
         case when lower(u.role) = 'admin' then 0 else 1 end,
         lower(u.name) asc
       limit $3 offset $4`,
      [search, searchLike, pageSize, offset]
    )
  ]);

  res.json({
    users: rowsResult.rows,
    total: Number(countResult.rows[0]?.total || 0),
    page,
    pageSize
  });
});

app.get("/api/admin/users/:id", auth, requireAdmin, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const result = await query(
    `select
       u.id,
       u.name,
       u.email,
       u.role,
       u.profile_image,
       u.created_at,
       w.address as wallet_address,
       coalesce(count(t.id), 0)::int as transactions_count,
       coalesce(sum(case when t.status = 'Confirmed' then t.usd_value else 0 end), 0)::numeric(18,2) as confirmed_volume_usd
     from users u
     left join wallets w on w.user_id = u.id
     left join transactions t on t.user_id = u.id
     where u.id = $1
     group by u.id, w.address
     limit 1`,
    [req.params.id]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

app.put("/api/admin/users/:id", auth, requireAdmin, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const id = req.params.id;
  const name = String(req.body.name || "").trim();
  const email = cleanEmail(req.body.email);
  const role = String(req.body.role || "user").toLowerCase();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  const profileImage = Object.prototype.hasOwnProperty.call(req.body, "profileImage") ? String(req.body.profileImage || "") : null;
  if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  const errors = [validateName(name), validateEmail(email)].filter(Boolean);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });
  if (profileImage && !profileImage.startsWith("data:image/")) {
    return res.status(400).json({ error: "Profile image must be an image data URL" });
  }
  if ((password || confirmPassword) && (!password || !confirmPassword)) {
    return res.status(400).json({ error: "Provide both new password and confirm password" });
  }
  if (password && password !== confirmPassword) {
    return res.status(400).json({ error: "New passwords do not match" });
  }
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
  }

  try {
    let passwordSql = "";
    const params = [id, name, email, role, profileImage];
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      params.push(passwordHash);
      passwordSql = ", password_hash = $6";
    }
    const result = await query(
      `update users
       set name = $2,
           email = $3,
           role = $4,
           profile_image = case when $5::text is null then profile_image else nullif($5::text, '') end,
           ${passwordSql ? "password_hash = $6," : ""}
           updated_at = now()
       where id = $1
       returning id, name, email, role, profile_image`,
      params
    );
    const updated = result.rows[0];
    if (!updated) return res.status(404).json({ error: "User not found" });
    const walletResult = await query("select address from wallets where user_id = $1 limit 1", [id]);
    res.json({
      user: {
        ...updated,
        walletAddress: walletResult.rows[0]?.address || ""
      }
    });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email is already in use" });
    throw error;
  }
});

app.delete("/api/admin/users/:id", auth, requireAdmin, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const id = req.params.id;
  const requesterId = currentUserId(req);
  if (!id) return res.status(400).json({ error: "User id is required" });
  if (id === requesterId) return res.status(400).json({ error: "You cannot delete your own admin account" });

  const userResult = await query("select id, role from users where id = $1 limit 1", [id]);
  const target = userResult.rows[0];
  if (!target) return res.status(404).json({ error: "User not found" });

  if (String(target.role || "").toLowerCase() === "admin") {
    const adminCountResult = await query("select count(*)::int as total from users where role = 'admin'", []);
    const totalAdmins = Number(adminCountResult.rows[0]?.total || 0);
    if (totalAdmins <= 1) {
      return res.status(400).json({ error: "Cannot delete the last admin account" });
    }
  }

  const minerUsage = await query("select count(*)::int as total from mined_blocks where miner_user_id = $1", [id]);
  if (Number(minerUsage.rows[0]?.total || 0) > 0) {
    return res.status(400).json({ error: "Cannot delete user because this account has verified mined blocks" });
  }

  await query("delete from users where id = $1", [id]);
  res.json({ ok: true });
});

app.get("/api/wallet", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const userId = currentUserId(req);
  let wallet = { address: "", network: "sepolia" };
  let balanceEth = 0;
  let assets = [];
  let balanceHistory = [];
  let dailyBalanceHistory = [];
  const prices = await getPrices();
  const walletResult = await query(
    "select id, address, network from wallets where user_id = $1 limit 1",
    [userId]
  );
  wallet = walletResult.rows[0] || wallet;
  if (!wallet.id) return res.status(404).json({ error: "Wallet not found" });
    const assetResult = await query(
      `select
        a.symbol,
        a.name,
        a.coingecko_id,
        a.icon_url,
        a.chain,
        a.decimals,
        a.icon_color,
        b.balance,
        b.locked_balance,
        b.updated_at
      from wallet_balances b
      join coin_assets a on a.id = b.asset_id
      where b.wallet_id = $1 and a.is_active = true
      order by
        case a.symbol
          when 'ETH' then 1
          when 'BTC' then 2
          when 'USDC' then 3
          when 'DAI' then 4
          else 10
        end,
        a.symbol`,
    [wallet.id]
    );
    assets = assetResult.rows.map((asset) => {
      const priceKey = priceKeyByCoinGeckoId[asset.coingecko_id] || asset.coingecko_id;
      const price = prices[priceKey]?.usd || 0;
      const balance = Number(asset.balance || 0);
      const lockedBalance = Number(asset.locked_balance || 0);
      return {
        symbol: asset.symbol,
        name: asset.name,
        chain: asset.chain,
        decimals: asset.decimals,
        iconColor: asset.icon_color,
        iconUrl: asset.icon_url,
        balance,
        lockedBalance,
        availableBalance: Math.max(balance - lockedBalance, 0),
        priceUsd: price,
        usdValue: balance * price,
        change24h: prices[priceKey]?.usd_24h_change || 0
      };
    });
    balanceEth = assets.find((asset) => asset.symbol === "ETH")?.balance || balanceEth;
    const historyResult = await query(
      `with monthly as (
        select
          date_trunc('month', created_at)::date as month,
          sum(case when lower(to_address) = lower($1) then usd_value else -usd_value end) as net_usd
        from transactions
        where user_id = $2 and status = 'Confirmed' and created_at >= now() - interval '2 years'
        group by 1
      ),
      series as (
        select generate_series(date_trunc('month', now()) - interval '23 months', date_trunc('month', now()), interval '1 month')::date as month
      ),
      current_value as (
        select $3::numeric as usd_value
      ),
      joined as (
        select s.month, coalesce(m.net_usd, 0) as net_usd
        from series s left join monthly m on m.month = s.month
      )
      select
        month,
        greatest(
          0,
          (select usd_value from current_value)
          - coalesce(sum(net_usd) over (order by month desc rows between unbounded preceding and 1 preceding), 0)
        ) as balance_usd
      from joined
      order by month`,
    [wallet.address, userId, assets.reduce((sum, asset) => sum + asset.usdValue, 0)]
    );
    balanceHistory = historyResult.rows.map((row) => ({
      date: row.month,
      label: new Date(row.month).toLocaleDateString("en-US", { month: "short" }),
      balanceUsd: Number(row.balance_usd || 0)
    }));
    const dailyHistoryResult = await query(
      `with daily as (
        select
          date_trunc('day', created_at)::date as day,
          sum(case when lower(to_address) = lower($1) then usd_value else -usd_value end) as net_usd
        from transactions
        where user_id = $2 and status = 'Confirmed' and created_at >= date_trunc('day', now()) - interval '29 days'
        group by 1
      ),
      series as (
        select generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day')::date as day
      ),
      current_value as (
        select $3::numeric as usd_value
      ),
      joined as (
        select s.day, coalesce(d.net_usd, 0) as net_usd
        from series s left join daily d on d.day = s.day
      )
      select
        day,
        greatest(
          0,
          (select usd_value from current_value)
          - coalesce(sum(net_usd) over (order by day desc rows between unbounded preceding and 1 preceding), 0)
        ) as balance_usd
      from joined
      order by day`,
      [wallet.address, userId, assets.reduce((sum, asset) => sum + asset.usdValue, 0)]
    );
    dailyBalanceHistory = dailyHistoryResult.rows.map((row) => ({
      date: row.day,
      label: new Date(row.day).toLocaleDateString("en-US", { day: "2-digit" }),
      balanceUsd: Number(row.balance_usd || 0)
    }));
  const usdValue = assets.length
    ? assets.reduce((sum, asset) => sum + asset.usdValue, 0)
    : balanceEth * prices.ethereum.usd;
  res.json({
    address: wallet.address,
    network: wallet.network,
    balanceEth,
    usdValue,
    assets,
    portfolio: assets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      value: usdValue ? (asset.usdValue / usdValue) * 100 : 0,
      amount: asset.usdValue,
      color: asset.iconColor
    })),
    balanceHistory,
    dailyBalanceHistory
  });
});

app.get("/api/transactions", auth, async (req, res) => {
  if (!hasDatabase) return res.json({ transactions: [] });
  const userId = currentUserId(req);
  const admin = isAdmin(req);
  const result = await query(
    `select
      t.*,
      coalesce(t.amount, t.amount_eth) as amount,
      a.symbol as asset_symbol,
      a.name as asset_name,
      a.icon_color as asset_icon_color,
      a.icon_url as asset_icon_url,
      u.name as owner_name,
      u.email as owner_email
     from transactions t
     left join coin_assets a on a.id = t.asset_id
     left join users u on u.id = t.user_id
     where ($2::boolean = true or t.user_id = $1)
     order by t.created_at desc
     limit 500`,
    [userId, admin]
  );
  res.json({ transactions: result.rows });
});

app.get("/api/transactions/:hash", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const result = await query(
    `select
       t.*,
       coalesce(t.amount, t.amount_eth) as amount,
       a.symbol as asset_symbol,
       a.name as asset_name,
       a.icon_color as asset_icon_color,
       a.icon_url as asset_icon_url,
       a.decimals as asset_decimals,
       owner.name as owner_name,
       miner.name as miner_name,
       miner_wallet.address as miner_wallet_address,
       m.status as mempool_status,
       m.created_at as mempool_created_at,
       b.id as block_id,
       b.block_hash,
       b.previous_hash,
       b.nonce,
       b.difficulty,
       b.transaction_count,
       b.total_value_usd as block_total_value_usd,
       b.reward_usd as block_reward_usd,
       b.verified_at as block_verified_at,
       coalesce(
         nullif(t.miner_reward_amount, 0),
         nullif(t.gas_fee_amount, 0),
         nullif(m.miner_reward_amount, 0),
         0
       ) as display_fee_amount,
       coalesce(
         nullif(t.miner_reward_usd, 0),
         nullif(m.miner_reward_usd, 0),
         0
       ) as display_fee_usd
     from transactions t
     left join coin_assets a on a.id = t.asset_id
     left join users owner on owner.id = t.user_id
     left join users miner on miner.id = t.miner_user_id
     left join wallets miner_wallet on miner_wallet.user_id = miner.id
     left join mempool_transactions m on m.transaction_id = t.id
     left join block_transactions bt on bt.transaction_id = t.id
     left join mined_blocks b on b.id = bt.block_id
     where lower(t.transaction_hash) = lower($1)
     limit 1`,
    [req.params.hash]
  );
  const transaction = result.rows[0];
  if (!transaction) return res.status(404).json({ error: "Transaction not found" });
  res.json({ transaction });
});

app.post("/api/transactions", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const userId = currentUserId(req);
  const { receiverAddress, amount, amountEth, assetSymbol = "ETH" } = req.body;
  const transferAmount = Number(amount ?? amountEth);
  if (!ethers.isAddress(receiverAddress)) return res.status(400).json({ error: "Invalid receiver address" });
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) return res.status(400).json({ error: "Invalid transfer amount" });

  const walletResult = await query("select id, address from wallets where user_id = $1 limit 1", [userId]);
  const wallet = walletResult.rows[0];
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });

  let txHash = ethers.id(`cryptowallet-${uuid()}-${Date.now()}`);
  let status = "Pending";

  if (assetSymbol.toUpperCase() === "ETH" && process.env.WALLET_PRIVATE_KEY && provider) {
    const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
    const tx = await signer.sendTransaction({
      to: receiverAddress,
      value: ethers.parseEther(String(transferAmount))
    });
    txHash = tx.hash;
  }

  const prices = await getPrices();
  const assetResult = await query("select * from coin_assets where symbol = $1 limit 1", [assetSymbol.toUpperCase()]);
  const asset = assetResult.rows[0];
  if (!asset) return res.status(404).json({ error: "Asset not found" });
  const priceKey = priceKeyByCoinGeckoId[asset.coingecko_id] || "ethereum";
  const price = prices[priceKey]?.usd || prices.ethereum.usd;
  const minerRewardAmount = Number((transferAmount * minerRewardRate).toFixed(12));
  const minerRewardUsd = Number((minerRewardAmount * price).toFixed(2));
  const balanceResult = await query(
    `select balance, locked_balance from wallet_balances where wallet_id = $1 and asset_id = $2 limit 1`,
    [wallet.id, asset.id]
  );
  const balance = balanceResult.rows[0];
  const availableBalance = Number(balance?.balance || 0) - Number(balance?.locked_balance || 0);
  if (availableBalance < transferAmount + minerRewardAmount) {
    return res.status(400).json({ error: `Insufficient ${asset.symbol} balance` });
  }
  const record = {
    id: uuid(),
    transaction_hash: txHash,
    from_address: wallet.address,
    to_address: receiverAddress,
    amount: transferAmount,
    amount_eth: asset.symbol === "ETH" ? transferAmount : 0,
    usd_value: transferAmount * price,
    status,
    block_number: null,
    miner_reward_amount: minerRewardAmount,
    miner_reward_usd: minerRewardUsd,
    gas_fee_eth: 0,
    confirmations: 0,
    asset_symbol: asset.symbol,
    asset_name: asset.name,
    asset_icon_color: asset.icon_color,
    asset_icon_url: asset.icon_url,
    created_at: new Date().toISOString()
  };

    await query(
      `insert into transactions (
         id, user_id, asset_id, transaction_hash, from_address, to_address, amount, amount_eth, usd_value, status, miner_reward_amount, miner_reward_usd
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        record.id,
        userId,
        asset.id,
        record.transaction_hash,
        record.from_address,
        record.to_address,
        record.amount,
        record.amount_eth,
        record.usd_value,
        record.status,
        record.miner_reward_amount,
        record.miner_reward_usd
      ]
    );
    await query(
      `insert into mempool_transactions (id, transaction_id, user_id, asset_id, status, miner_reward_amount, miner_reward_usd)
       values ($1, $2, $3, $4, 'Pending', $5, $6)`,
      [uuid(), record.id, userId, asset.id, record.miner_reward_amount, record.miner_reward_usd]
    );
    await query(
      `update wallet_balances
       set balance = greatest(balance - $1::numeric, 0), updated_at = now()
       where wallet_id = (select id from wallets where user_id = $2 limit 1) and asset_id = $3`,
      [record.amount + record.miner_reward_amount, userId, asset.id]
    );
  res.status(201).json({ transaction: record });
});

app.get("/api/miners", auth, async (req, res) => {
  if (!hasDatabase) return res.json({ miners: [] });
  const userId = currentUserId(req);
  const result = await query(
    `select
       u.id,
       u.name,
       u.email,
       w.address as wallet_address,
       count(b.id)::int as verified_blocks,
       coalesce(sum(b.reward_usd), 0)::numeric(18,2) as reward_usd
     from users u
     left join wallets w on w.user_id = u.id
     left join mined_blocks b on b.miner_user_id = u.id
     group by u.id, u.name, u.email, w.address
     order by case when u.id = $1 then 1 else 0 end, u.name`,
    [userId]
  );
  res.json({ miners: result.rows });
});

app.get("/api/mempool", auth, async (_req, res) => {
  if (!hasDatabase) return res.json({ pending: [], blocks: [] });
  const pending = await query(
    `select
       m.id as mempool_id,
       m.status as mempool_status,
       m.created_at as mempool_created_at,
       t.*,
       coalesce(t.amount, t.amount_eth) as amount,
       coalesce(nullif(t.miner_reward_amount, 0), m.miner_reward_amount) as miner_reward_amount,
       coalesce(nullif(t.miner_reward_usd, 0), m.miner_reward_usd) as miner_reward_usd,
       a.symbol as asset_symbol,
       a.name as asset_name,
       a.icon_color as asset_icon_color,
       a.icon_url as asset_icon_url,
       u.name as owner_name,
       u.email as owner_email
     from mempool_transactions m
     join transactions t on t.id = m.transaction_id
     left join coin_assets a on a.id = t.asset_id
     left join users u on u.id = t.user_id
     where m.status = 'Pending' and t.status = 'Pending'
     order by m.created_at desc`,
    []
  );
  const blocks = await query(
    `select
       b.*,
       u.name as miner_name,
       u.email as miner_email,
       coalesce(
         json_agg(
           json_build_object(
             'id', t.id,
             'transaction_hash', t.transaction_hash,
             'from_address', t.from_address,
             'to_address', t.to_address,
             'amount', coalesce(t.amount, t.amount_eth),
             'usd_value', t.usd_value,
             'asset_symbol', a.symbol,
             'asset_icon_url', a.icon_url,
             'status', t.status,
             'miner_reward_amount', t.miner_reward_amount,
             'miner_reward_usd', t.miner_reward_usd
           )
           order by bt.position
         ) filter (where t.id is not null),
         '[]'::json
       ) as transactions
     from mined_blocks b
     left join users u on u.id = b.miner_user_id
     left join block_transactions bt on bt.block_id = b.id
     left join transactions t on t.id = bt.transaction_id
     left join coin_assets a on a.id = t.asset_id
     group by b.id, u.name, u.email
     order by b.verified_at desc nulls last, b.created_at desc
    limit 12`,
    []
  );
  res.json({ pending: pending.rows, blocks: blocks.rows });
});

app.post("/api/mempool/verify", auth, async (req, res) => {
  if (!hasDatabase) return res.status(503).json({ error: "Database is not configured" });
  const { transactionIds = [] } = req.body;
  const minerUserId = currentUserId(req);
  const ids = Array.isArray(transactionIds) ? transactionIds.filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ error: "Select at least one pending transaction" });

  const minerResult = await query(
    "select u.id, u.name, w.id as wallet_id, w.address from users u left join wallets w on w.user_id = u.id where u.id = $1 limit 1",
    [minerUserId]
  );
  const miner = minerResult.rows[0];
  if (!miner) return res.status(404).json({ error: "Miner user not found" });

  const txResult = await query(
    `select
       m.id as mempool_id,
       t.*,
       coalesce(t.amount, t.amount_eth) as amount,
       a.symbol as asset_symbol,
       a.name as asset_name,
       a.icon_color as asset_icon_color,
       a.icon_url as asset_icon_url,
       coalesce(nullif(t.miner_reward_amount, 0), m.miner_reward_amount) as reward_amount,
       coalesce(nullif(t.miner_reward_usd, 0), m.miner_reward_usd) as reward_usd
     from mempool_transactions m
     join transactions t on t.id = m.transaction_id
     left join coin_assets a on a.id = t.asset_id
     where m.status = 'Pending'
       and t.status = 'Pending'
       and t.id = any($1::uuid[])
     order by m.created_at asc`,
    [ids]
  );
  const selected = txResult.rows;
  if (!selected.length) return res.status(404).json({ error: "No pending transactions found" });
  const ownTx = selected.find((tx) => tx.user_id === minerUserId);
  if (ownTx) return res.status(403).json({ error: "A miner cannot verify their own transaction" });

  const blockNumberResult = await query("select coalesce(max(block_number), 19000000) + 1 as next_block from transactions");
  const blockNumber = Number(blockNumberResult.rows[0].next_block);
  const previousHashResult = await query("select block_hash from mined_blocks order by block_number desc limit 1");
  const previousHash = previousHashResult.rows[0]?.block_hash || null;
  const nonce = Math.floor(Math.random() * 900000) + 100000;
  const blockHash = ethers.id(`${previousHash || "genesis"}:${blockNumber}:${minerUserId}:${selected.map((tx) => tx.transaction_hash).join(":")}:${nonce}`);
  const blockId = uuid();
  const totalValueUsd = selected.reduce((sum, tx) => sum + Number(tx.usd_value || 0), 0);
  const rewardUsd = selected.reduce((sum, tx) => sum + Number(tx.reward_usd || 0), 0);

  await query(
    `insert into mined_blocks (
       id, block_number, block_hash, previous_hash, miner_user_id, transaction_count, total_value_usd, reward_usd, nonce, difficulty, status, verified_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,'Verified',now())`,
    [blockId, blockNumber, blockHash, previousHash, minerUserId, selected.length * 2, totalValueUsd, rewardUsd, nonce]
  );

  for (const [index, tx] of selected.entries()) {
    await query(
      `insert into block_transactions (id, block_id, transaction_id, position)
       values ($1,$2,$3,$4)`,
      [uuid(), blockId, tx.id, index + 1]
    );
    await query(
      `update transactions
       set status = 'Confirmed',
           block_number = $1,
           miner_user_id = $2,
           miner_reward_amount = $3,
           miner_reward_usd = $4,
           gas_fee_amount = $3,
           confirmed_at = now()
       where id = $5`,
      [blockNumber, minerUserId, tx.reward_amount, tx.reward_usd, tx.id]
    );
    await query(
      `update mempool_transactions
       set status = 'Included', included_at = now()
       where transaction_id = $1`,
      [tx.id]
    );
    if (miner.wallet_id && tx.asset_id) {
      await query(
        `update wallet_balances
         set balance = balance + $1::numeric, updated_at = now()
         where wallet_id = $2 and asset_id = $3`,
        [tx.reward_amount, miner.wallet_id, tx.asset_id]
      );
    }
    const rewardTransactionId = uuid();
    const rewardHash = ethers.id(`miner-reward:${blockHash}:${tx.id}:${minerUserId}`);
    await query(
      `insert into transactions (
         id, user_id, asset_id, transaction_hash, from_address, to_address, amount, amount_eth, usd_value, status, block_number, miner_user_id, confirmed_at
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Confirmed',$10,$2,now())
       on conflict (transaction_hash) do nothing`,
      [
        rewardTransactionId,
        minerUserId,
        tx.asset_id,
        rewardHash,
        miningRewardAddress,
        miner.address,
        tx.reward_amount,
        tx.asset_symbol === "ETH" ? tx.reward_amount : 0,
        tx.reward_usd,
        blockNumber
      ]
    );
    await query(
      `insert into block_transactions (id, block_id, transaction_id, position)
       values ($1,$2,$3,$4)
       on conflict do nothing`,
      [uuid(), blockId, rewardTransactionId, selected.length + index + 1]
    );
    await query(
      `insert into notifications (id, user_id, type, title, message)
       values ($1,$2,'confirmed',$3,$4)`,
      [
        uuid(),
        tx.user_id,
        `${tx.asset_symbol || "Crypto"} Transaction Confirmed`,
        `${miner.name} verified your transaction in block ${blockNumber}. Miner reward: ${Number(tx.reward_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${tx.asset_symbol || ""}.`
      ]
    );
    await query(
      `insert into notifications (id, user_id, type, title, message)
       values ($1,$2,'reward',$3,$4)`,
      [
        uuid(),
        minerUserId,
        `${tx.asset_symbol || "Crypto"} Mining Reward Earned`,
        `You verified a transaction in block ${blockNumber} and earned ${Number(tx.reward_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${tx.asset_symbol || ""} (${Number(tx.reward_usd || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}).`
      ]
    );
  }

  const block = {
    id: blockId,
    block_number: blockNumber,
    block_hash: blockHash,
    previous_hash: previousHash,
    miner_user_id: minerUserId,
    miner_name: miner.name,
    transaction_count: selected.length,
    total_value_usd: totalValueUsd,
    reward_usd: rewardUsd,
    nonce,
    status: "Verified",
    verified_at: new Date().toISOString()
  };
  res.json({ block, transactions: selected.map((tx) => ({ ...tx, status: "Confirmed", block_number: blockNumber, miner_user_id: minerUserId })) });
});

app.post("/api/verify", auth, async (req, res) => {
  const { transactionHash } = req.body;
  if (!transactionHash) return res.status(400).json({ error: "transactionHash is required" });
  const userId = currentUserId(req);

  const verification = await verifyTransaction(transactionHash);
  if (hasDatabase) {
    await query(
      `insert into transaction_verifications
       (id, user_id, transaction_hash, status, block_number, from_address, to_address, value_eth, gas_fee_eth, confirmations, verified_at, raw_payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11)`,
      [
        uuid(),
        userId,
        transactionHash,
        verification.status,
        verification.blockNumber,
        verification.from,
        verification.to,
        verification.valueEth,
        verification.gasFeeEth,
        verification.confirmations,
        verification
      ]
    );
  }
  res.json({ verification });
});

app.get("/api/prices", async (_req, res) => {
  res.json(await getPrices());
});

app.get("/api/prices/status", async (_req, res) => {
  const now = new Date();
  const currentHour = hourBucket(now);
  if (!hasDatabase) {
    return res.json({
      source: "memory-fallback",
      trackedCoins: trackedPriceCoins.length,
      currentHour,
      isFresh: false,
      staleHours: null,
      refreshedAt: null
    });
  }

  await ensureTrackedCoins();
  const latest = await query(
    `select distinct on (symbol)
       symbol,
       hour_bucket,
       refreshed_at
     from coin_price_hourly_cache
     where symbol = any($1::varchar[])
     order by symbol, hour_bucket desc, refreshed_at desc`,
    [trackedPriceCoins.map((coin) => coin.symbol)]
  );
  const latestRows = latest.rows;
  const uniqueHours = [...new Set(latestRows.map((row) => new Date(row.hour_bucket).toISOString()))].sort();
  const newestHour = uniqueHours[uniqueHours.length - 1] || null;
  const isFresh = latestRows.length === trackedPriceCoins.length && newestHour === currentHour;
  const staleHours = newestHour ? Math.floor((Date.now() - new Date(newestHour).getTime()) / 3_600_000) : null;
  const refreshedAt = latestRows
    .map((row) => (row.refreshed_at ? new Date(row.refreshed_at) : null))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  res.json({
    source: isFresh ? "coin_price_hourly_cache:fresh" : "coin_price_hourly_cache:stale-fallback",
    trackedCoins: trackedPriceCoins.length,
    cachedSymbols: latestRows.length,
    currentHour,
    newestCachedHour: newestHour,
    isFresh,
    staleHours,
    refreshedAt: refreshedAt ? refreshedAt.toISOString() : null
  });
});

app.get("/api/market", async (_req, res) => {
  res.json({ coins: await getCryptoMarkets(), refreshedAt: new Date().toISOString() });
});

app.get("/api/notifications", auth, async (req, res) => {
  if (!hasDatabase) return res.json({ notifications: [] });
  const result = await query("select * from notifications where user_id = $1 order by created_at desc limit 100", [currentUserId(req)]);
  res.json({ notifications: result.rows });
});

async function getPrices() {
  if (Date.now() < priceCache.expiresAt) return priceCache.data;
  if (!hasDatabase) {
    priceCache = { expiresAt: Date.now() + 60_000, data: toPricePayload() };
    return priceCache.data;
  }

  await ensureTrackedCoins();

  const currentHour = hourBucket();
  const latestResult = await query(
    `select distinct on (symbol)
       symbol,
       coingecko_id,
       price_usd,
       change_24h,
       hour_bucket
     from coin_price_hourly_cache
     where symbol = any($1::varchar[])
     order by symbol, hour_bucket desc, refreshed_at desc`,
    [trackedPriceCoins.map((coin) => coin.symbol)]
  );
  const latestRows = latestResult.rows;
  const hasFreshHour = latestRows.length === trackedPriceCoins.length
    && latestRows.every((row) => new Date(row.hour_bucket).toISOString() === currentHour);
  if (hasFreshHour) {
    const data = toPricePayload(latestRows);
    priceCache = { expiresAt: Date.now() + 60_000, data };
    return data;
  }

  const staleRowsBySymbol = new Map(latestRows.map((row) => [row.symbol, row]));
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids: trackedPriceCoins.map((coin) => coin.coingeckoId).join(","),
        vs_currencies: "usd",
        include_24hr_change: "true"
      },
      timeout: 8000
    });
    const rowsToUpsert = trackedPriceCoins.map((coin) => {
      const incoming = response.data[coin.coingeckoId];
      const stale = staleRowsBySymbol.get(coin.symbol);
      const usd = Number.isFinite(Number(incoming?.usd))
        ? Number(incoming.usd)
        : Number(stale?.price_usd ?? coin.fallbackUsd);
      const change24h = Number.isFinite(Number(incoming?.usd_24h_change))
        ? Number(incoming.usd_24h_change)
        : Number(stale?.change_24h ?? coin.fallbackChange24h);
      return {
        symbol: coin.symbol,
        coingeckoId: coin.coingeckoId,
        priceUsd: usd,
        change24h
      };
    });

    const valuesSql = rowsToUpsert
      .map((_, idx) => {
        const base = idx * 7;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      })
      .join(", ");
    const params = rowsToUpsert.flatMap((row) => [
      uuid(),
      row.symbol,
      row.coingeckoId,
      row.priceUsd,
      row.change24h,
      currentHour,
      "coingecko"
    ]);
    await query(
      `insert into coin_price_hourly_cache
         (id, symbol, coingecko_id, price_usd, change_24h, hour_bucket, source)
       values ${valuesSql}
       on conflict (symbol, hour_bucket) do update
         set coingecko_id = excluded.coingecko_id,
             price_usd = excluded.price_usd,
             change_24h = excluded.change_24h,
             source = excluded.source,
             refreshed_at = now()`,
      params
    );
    await query("delete from coin_price_hourly_cache where hour_bucket < date_trunc('hour', now()) - interval '14 days'");

    const data = toPricePayload(
      rowsToUpsert.map((row) => ({
        symbol: row.symbol,
        coingecko_id: row.coingeckoId,
        price_usd: row.priceUsd,
        change_24h: row.change24h
      }))
    );
    priceCache = { expiresAt: Date.now() + 60_000, data };
    return data;
  } catch {
    const data = latestRows.length ? toPricePayload(latestRows) : toPricePayload();
    priceCache = { expiresAt: Date.now() + 60_000, data };
    return data;
  }
}

async function getCryptoMarkets() {
  if (Date.now() < marketCache.expiresAt) return marketCache.data;
  try {
    const cachedPrices = await getPrices();
    const priceBySymbol = new Map(
      trackedPriceCoins.map((coin) => [
        coin.symbol,
        {
          usd: Number(cachedPrices[coin.priceKey]?.usd ?? coin.fallbackUsd),
          change24h: Number(cachedPrices[coin.priceKey]?.usd_24h_change ?? coin.fallbackChange24h)
        }
      ])
    );
    const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 30,
        page: 1,
        sparkline: "true",
        price_change_percentage: "1h,24h,7d"
      },
      timeout: 8000
    });
    marketCache = {
      expiresAt: Date.now() + 60_000,
      data: response.data.map((coin) => ({
        id: coin.id,
        rank: coin.market_cap_rank,
        name: coin.name,
        symbol: coin.symbol?.toUpperCase(),
        image: coin.image,
        price: priceBySymbol.get(coin.symbol?.toUpperCase())?.usd ?? coin.current_price,
        change1h: coin.price_change_percentage_1h_in_currency,
        change24h: priceBySymbol.get(coin.symbol?.toUpperCase())?.change24h ?? coin.price_change_percentage_24h_in_currency,
        change7d: coin.price_change_percentage_7d_in_currency,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        circulatingSupply: coin.circulating_supply,
        sparkline: coin.sparkline_in_7d?.price?.slice(-48) || []
      }))
    };
  } catch {
    // Keep the last known market data so the market page remains usable offline.
  }
  return marketCache.data;
}

async function verifyTransaction(transactionHash) {
  if (provider && ethers.isHexString(transactionHash, 32)) {
    const [tx, receipt, currentBlock] = await Promise.all([
      provider.getTransaction(transactionHash),
      provider.getTransactionReceipt(transactionHash),
      provider.getBlockNumber()
    ]);
    if (tx) {
      const block = tx.blockNumber ? await provider.getBlock(tx.blockNumber) : null;
      const gasFee = receipt ? receipt.gasUsed * receipt.gasPrice : 0n;
      return {
        transactionHash,
        status: receipt?.status === 1 ? "Confirmed" : "Pending",
        blockNumber: tx.blockNumber,
        timestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
        from: tx.from,
        to: tx.to,
        valueEth: ethers.formatEther(tx.value),
        gasFeeEth: ethers.formatEther(gasFee),
        confirmations: tx.blockNumber ? currentBlock - tx.blockNumber + 1 : 0,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${transactionHash}`
      };
    }
  }

  if (hasDatabase) {
    const result = await query(
      `select t.*,
              a.symbol as asset_symbol,
              coalesce(nullif(t.gas_fee_eth, 0), nullif(t.gas_fee_amount, 0), nullif(t.miner_reward_amount, 0), nullif(m.miner_reward_amount, 0), 0) as display_fee_amount,
              coalesce(nullif(t.miner_reward_usd, 0), nullif(m.miner_reward_usd, 0), 0) as display_fee_usd
       from transactions t
       left join coin_assets a on a.id = t.asset_id
       left join mempool_transactions m on m.transaction_id = t.id
       where t.transaction_hash = $1 limit 1`,
      [transactionHash]
    );
    const tx = result.rows[0];
    if (tx) {
      return {
        transactionHash,
        status: tx.status,
        blockNumber: tx.block_number,
        timestamp: tx.created_at,
        from: tx.from_address,
        to: tx.to_address,
        valueEth: String(tx.amount || tx.amount_eth),
        assetSymbol: tx.asset_symbol || "ETH",
        gasFeeEth: String(tx.display_fee_amount || 0),
        feeSymbol: tx.asset_symbol || "ETH",
        feeUsd: Number(tx.display_fee_usd || 0),
        confirmations: tx.block_number ? 128 : 0,
        etherscanUrl: `https://sepolia.etherscan.io/tx/${transactionHash}`
      };
    }
  }

  return {
    transactionHash,
    status: "Not Found",
    blockNumber: null,
    timestamp: null,
    from: null,
    to: null,
    valueEth: "0",
    gasFeeEth: "0",
    confirmations: 0,
    etherscanUrl: `https://sepolia.etherscan.io/tx/${transactionHash}`
  };
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`CryptoWallet API listening on http://localhost:${port}`);
});

begin;

-- Deterministic demo seed. Re-running this file recreates the same handoff data.
-- Demo users:
-- Admin: admin@cryptowallet.com / Admin@Crypto2026
-- Jarin: tabassum@cryptowallet.com / Jarin@Wallet2026
-- Nadia: nadia@cryptowallet.com / Nadia@Miner2026
-- Arman: arman@cryptowallet.com / Arman@Wallet2026

-- The Mira IDs below are legacy cleanup only; Mira is not recreated by this seed.
delete from block_transactions
where block_id in (
  select id from mined_blocks
  where miner_user_id in (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  )
)
or transaction_id in (
  select id from transactions
  where user_id in (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  )
);
delete from mined_blocks
where miner_user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
delete from mempool_transactions
where user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
)
or transaction_id in (
  select id from transactions
  where user_id in (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  )
);
delete from notifications where user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
delete from transaction_verifications where user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
delete from transactions where user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
delete from wallet_balances where wallet_id in (
  '99999999-9999-4999-8999-000000000001',
  '22222222-2222-4222-8222-222222222222',
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
);
delete from wallets where user_id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);
delete from users where id in (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

insert into coin_assets (symbol, name, coingecko_id, icon_url, chain, decimals, icon_color)
values
  ('ETH', 'Ethereum', 'ethereum', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 'ethereum', 18, '#627eea'),
  ('BTC', 'Bitcoin', 'bitcoin', 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', 'bitcoin', 8, '#f7931a'),
  ('USDC', 'USD Coin', 'usd-coin', 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', 'ethereum', 6, '#2775ca'),
  ('USDT', 'Tether', 'tether', 'https://assets.coingecko.com/coins/images/325/large/Tether.png', 'ethereum', 6, '#26a17b'),
  ('DAI', 'Dai', 'dai', 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png', 'ethereum', 18, '#f5ac37'),
  ('BNB', 'BNB', 'binancecoin', 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', 'bnb-chain', 18, '#f3ba2f'),
  ('XRP', 'XRP', 'ripple', 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png', 'xrp-ledger', 6, '#6366f1'),
  ('ADA', 'Cardano', 'cardano', 'https://assets.coingecko.com/coins/images/975/large/cardano.png', 'cardano', 6, '#1d4ed8'),
  ('MATIC', 'Polygon', 'matic-network', 'https://assets.coingecko.com/coins/images/4713/large/polygon.png', 'polygon', 18, '#8247e5'),
  ('SOL', 'Solana', 'solana', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 'solana', 9, '#14f195')
on conflict (symbol) do update set
  name = excluded.name,
  coingecko_id = excluded.coingecko_id,
  icon_url = excluded.icon_url,
  chain = excluded.chain,
  decimals = excluded.decimals,
  icon_color = excluded.icon_color,
  is_active = true;

delete from coin_price_hourly_cache
where symbol in ('ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'BNB', 'SOL', 'MATIC', 'XRP', 'ADA');

insert into tracked_coins (symbol, name, coingecko_id, is_active)
values
  ('ETH', 'Ethereum', 'ethereum', true),
  ('BTC', 'Bitcoin', 'bitcoin', true),
  ('USDC', 'USD Coin', 'usd-coin', true),
  ('USDT', 'Tether', 'tether', true),
  ('DAI', 'Dai', 'dai', true),
  ('BNB', 'BNB', 'binancecoin', true),
  ('SOL', 'Solana', 'solana', true),
  ('MATIC', 'Polygon', 'matic-network', true),
  ('XRP', 'XRP', 'ripple', true),
  ('ADA', 'Cardano', 'cardano', true)
on conflict (symbol) do update set
  name = excluded.name,
  coingecko_id = excluded.coingecko_id,
  is_active = true,
  updated_at = now();

insert into coin_price_hourly_cache (id, symbol, coingecko_id, price_usd, change_24h, hour_bucket, source)
values
  (gen_random_uuid(), 'ETH', 'ethereum', 2461.85, 2.35, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'BTC', 'bitcoin', 68235.40, 1.15, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'USDC', 'usd-coin', 1.00, 0.01, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'USDT', 'tether', 1.00, 0.00, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'DAI', 'dai', 1.00, 0.01, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'BNB', 'binancecoin', 615.40, 0.85, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'SOL', 'solana', 145.25, 2.10, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'MATIC', 'matic-network', 0.091783, -0.257700, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'XRP', 'ripple', 1.42, -0.45, date_trunc('hour', now()), 'seed'),
  (gen_random_uuid(), 'ADA', 'cardano', 0.48, 0.62, date_trunc('hour', now()), 'seed')
on conflict (symbol, hour_bucket) do update set
  coingecko_id = excluded.coingecko_id,
  price_usd = excluded.price_usd,
  change_24h = excluded.change_24h,
  source = excluded.source,
  refreshed_at = now();

insert into users (id, name, email, role, password_hash)
values (
  '99999999-9999-4999-8999-999999999999',
  'CryptoWallet Admin',
  'admin@cryptowallet.com',
  'admin',
  '$2a$12$o8TAhSQWJMXZoWLSfn5TVOnoM5BrMKO18kjQXrnrwqkiCt9JRr3ES'
)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  password_hash = excluded.password_hash,
  updated_at = now();

insert into wallets (id, user_id, address, network, encrypted_private_key)
values (
  '99999999-9999-4999-8999-000000000001',
  '99999999-9999-4999-8999-999999999999',
  '0xA9D12A6b0E35F22AA09B55c0E73A9351E818A111',
  'ethereum',
  null
)
on conflict (id) do update set
  address = excluded.address,
  network = excluded.network;

insert into users (id, name, email, role, password_hash)
values (
  '11111111-1111-4111-8111-111111111111',
  'Jarin Tabassum Anisa',
  'tabassum@cryptowallet.com',
  'user',
  '$2a$12$vA0WPGqrCeBkWy6IlMFcoeqNBNaEMLTANg2cje7bGmQmY7a7qr8G2'
);

insert into wallets (id, user_id, address, network, encrypted_private_key)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '0x8A1f3C6D9E2b4F70aC913F5D2B64e8C0A7d9B31F',
  'ethereum',
  null
);

insert into users (id, name, email, role, password_hash)
values
  ('33333333-3333-4333-8333-333333333333', 'Nadia Rahman', 'nadia@cryptowallet.com', 'user', '$2a$12$Imu5Yvut8zcQu.PtUrdrYuGaqxdfRECXT402F.nPGIo7L1NgPEaqO'),
  ('44444444-4444-4444-8444-444444444444', 'Arman Hossain', 'arman@cryptowallet.com', 'user', '$2a$12$2DUX7aiRNI4sa21lEUEa6.0825u7n0I.02.qiK4Dy/nj4ZnvEwkAC')
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  password_hash = excluded.password_hash,
  updated_at = now();

insert into wallets (id, user_id, address, network, encrypted_private_key)
values
  ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333', '0x5D3aB31c90999888A3376Ff2f0C44B02f34f41D1', 'ethereum', null),
  ('77777777-7777-4777-8777-777777777777', '44444444-4444-4444-8444-444444444444', '0x97f32B4B9aF31E7d4F438D6B1f26ad7aB8912d40', 'ethereum', null)
on conflict (id) do update set
  address = excluded.address,
  network = excluded.network;

insert into wallet_balances (wallet_id, asset_id, balance, locked_balance)
select wallet_id, id, 0, 0
from coin_assets
cross join (
  values
    ('99999999-9999-4999-8999-000000000001'::uuid),
    ('66666666-6666-4666-8666-666666666666'::uuid),
    ('77777777-7777-4777-8777-777777777777'::uuid)
) as miner_wallets(wallet_id)
where symbol in ('ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'BNB', 'XRP', 'ADA', 'MATIC', 'SOL')
on conflict (wallet_id, asset_id) do nothing;

insert into wallet_balances (wallet_id, asset_id, balance, locked_balance)
select
  '22222222-2222-4222-8222-222222222222',
  id,
  case symbol
    when 'ETH' then 8.7425
    when 'BTC' then 0.4128
    when 'USDC' then 12840.25
    when 'DAI' then 6840.75
    when 'BNB' then 18.64
    when 'USDT' then 0
    when 'XRP' then 0
    when 'ADA' then 0
    when 'MATIC' then 5420.50
    when 'SOL' then 96.35
    else 0
  end,
  case symbol
    when 'USDC' then 650.00
    when 'SOL' then 8.00
    else 0
  end
from coin_assets
where symbol in ('ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'BNB', 'XRP', 'ADA', 'MATIC', 'SOL')
on conflict (wallet_id, asset_id) do update set
  balance = excluded.balance,
  locked_balance = excluded.locked_balance,
  updated_at = now();

with generated as (
  select
    gs,
    case
      when gs % 7 = 0 then 'BTC'
      when gs % 7 = 1 then 'ETH'
      when gs % 7 = 2 then 'USDC'
      when gs % 7 = 3 then 'SOL'
      when gs % 7 = 4 then 'BNB'
      when gs % 7 = 5 then 'MATIC'
      else 'DAI'
    end as symbol,
    case when gs % 5 in (0, 3) then 'Sent' else 'Received' end as direction,
    case when gs % 43 = 0 then 'Pending' when gs % 97 = 0 then 'Failed' else 'Confirmed' end as status,
    ('2026-04-28 10:00:00+06'::timestamptz - ((gs * 47) || ' hours')::interval) as created_at
  from generate_series(1, 366) as gs
),
priced as (
  select
    g.*,
    case symbol
      when 'BTC' then round((0.002 + (gs % 8) * 0.0017)::numeric, 8)
      when 'ETH' then round((0.055 + (gs % 12) * 0.031)::numeric, 8)
      when 'USDC' then round((120 + (gs % 19) * 18.75)::numeric, 6)
      when 'DAI' then round((95 + (gs % 13) * 21.40)::numeric, 6)
      when 'BNB' then round((0.28 + (gs % 10) * 0.19)::numeric, 8)
      when 'MATIC' then round((140 + (gs % 21) * 17.5)::numeric, 6)
      when 'SOL' then round((1.25 + (gs % 15) * 0.42)::numeric, 8)
    end as amount,
    case symbol
      when 'BTC' then 61250 + (gs % 23) * 735
      when 'ETH' then 2180 + (gs % 17) * 34
      when 'USDC' then 1
      when 'DAI' then 1
      when 'BNB' then 510 + (gs % 12) * 13
      when 'MATIC' then 0.62 + (gs % 9) * 0.025
      when 'SOL' then 128 + (gs % 16) * 4.25
    end as price_usd
  from generated g
)
insert into transactions (
  id,
  user_id,
  asset_id,
  transaction_hash,
  from_address,
  to_address,
  amount,
  amount_eth,
  usd_value,
  status,
  block_number,
  gas_fee_amount,
  gas_fee_eth,
  created_at,
  confirmed_at
)
select
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111111',
  a.id,
  '0x' || md5('jarin-cryptowallet-tx-' || gs) || md5('jarin-cryptowallet-extra-' || gs),
  case
    when direction = 'Sent' then '0x8A1f3C6D9E2b4F70aC913F5D2B64e8C0A7d9B31F'
    else '0x' || substr(md5('jarin-sender-' || gs), 1, 40)
  end,
  case
    when direction = 'Sent' then '0x' || substr(md5('jarin-receiver-' || gs), 1, 40)
    else '0x8A1f3C6D9E2b4F70aC913F5D2B64e8C0A7d9B31F'
  end,
  amount,
  case when p.symbol = 'ETH' then amount else 0 end,
  round(amount * price_usd, 2),
  status,
  case when status = 'Pending' then null else 18980000 + gs end,
  case
    when status = 'Pending' then null
    when p.symbol in ('USDC', 'DAI') then round(0.45 + (gs % 5) * 0.11, 8)
    else round((amount * 0.0025)::numeric, 8)
  end,
  case when status = 'Pending' then null else round((0.00042 + (gs % 7) * 0.00009)::numeric, 8) end,
  p.created_at,
  case when status = 'Confirmed' then p.created_at + interval '3 minutes' else null end
from priced p
join coin_assets a on a.symbol = p.symbol;

insert into notifications (id, user_id, type, title, message, created_at)
values
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'confirmed', 'BTC Received', 'A Bitcoin deposit was confirmed and added to your portfolio.', '2026-04-28 09:42:00+06'::timestamptz),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'confirmed', 'SOL Transfer Confirmed', 'Your Solana transfer settled successfully.', '2026-04-28 08:00:00+06'::timestamptz),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'pending', 'USDC Transfer Pending', 'A USDC payment is waiting for network confirmation.', '2026-04-28 06:00:00+06'::timestamptz),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'security', 'New Sign-in', 'New CryptoWallet session created for tabassum@cryptowallet.com.', '2026-04-27 10:00:00+06'::timestamptz),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'confirmed', 'Portfolio Rebalanced', 'Your multi-asset wallet balances were refreshed from PostgreSQL records.', '2026-04-26 10:00:00+06'::timestamptz);

insert into mempool_transactions (transaction_id, user_id, asset_id, status, miner_reward_amount, miner_reward_usd, created_at)
select
  t.id,
  t.user_id,
  t.asset_id,
  'Pending',
  coalesce(nullif(t.miner_reward_amount, 0), round((coalesce(t.amount, t.amount_eth) * 0.001)::numeric, 18)),
  coalesce(nullif(t.miner_reward_usd, 0), round((t.usd_value * 0.001)::numeric, 2)),
  t.created_at
from transactions t
where t.status = 'Pending'
on conflict (transaction_id) do update set
  status = 'Pending',
  miner_reward_amount = excluded.miner_reward_amount,
  miner_reward_usd = excluded.miner_reward_usd;

commit;

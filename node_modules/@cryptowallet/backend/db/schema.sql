create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  email varchar(180) not null unique,
  role varchar(20) not null default 'user' check (role in ('admin', 'user')),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists profile_image text;
alter table users add column if not exists role varchar(20) not null default 'user';

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  address varchar(64) not null unique,
  network varchar(40) not null default 'sepolia',
  encrypted_private_key text,
  created_at timestamptz not null default now()
);

create table if not exists coin_assets (
  id uuid primary key default gen_random_uuid(),
  symbol varchar(12) not null unique,
  name varchar(80) not null,
  coingecko_id varchar(80),
  icon_url text,
  chain varchar(40) not null default 'multi-chain',
  decimals integer not null default 18,
  icon_color varchar(16) not null default '#64748b',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table coin_assets add column if not exists icon_url text;

create table if not exists wallet_balances (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  asset_id uuid not null references coin_assets(id) on delete cascade,
  balance numeric(32, 18) not null default 0,
  locked_balance numeric(32, 18) not null default 0,
  updated_at timestamptz not null default now(),
  unique(wallet_id, asset_id)
);

create index if not exists idx_wallet_balances_wallet on wallet_balances(wallet_id);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  asset_id uuid references coin_assets(id) on delete set null,
  transaction_hash varchar(100) not null unique,
  from_address varchar(64) not null,
  to_address varchar(64) not null,
  amount numeric(32, 18),
  amount_eth numeric(28, 18) not null,
  usd_value numeric(18, 2),
  status varchar(24) not null check (status in ('Pending', 'Confirmed', 'Failed')),
  block_number bigint,
  gas_fee_amount numeric(32, 18),
  gas_fee_eth numeric(28, 18),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table transactions add column if not exists asset_id uuid references coin_assets(id) on delete set null;
alter table transactions add column if not exists amount numeric(32, 18);
alter table transactions add column if not exists gas_fee_amount numeric(32, 18);
alter table transactions add column if not exists miner_user_id uuid references users(id) on delete set null;
alter table transactions add column if not exists miner_reward_amount numeric(32, 18) not null default 0;
alter table transactions add column if not exists miner_reward_usd numeric(18, 2) not null default 0;

create index if not exists idx_transactions_user_created on transactions(user_id, created_at desc);
create index if not exists idx_transactions_asset on transactions(asset_id);
create index if not exists idx_transactions_status on transactions(status);
create index if not exists idx_transactions_hash on transactions(transaction_hash);

create table if not exists mined_blocks (
  id uuid primary key default gen_random_uuid(),
  block_number bigint not null unique,
  block_hash varchar(100) not null unique,
  previous_hash varchar(100),
  miner_user_id uuid not null references users(id) on delete restrict,
  transaction_count integer not null default 0,
  total_value_usd numeric(18, 2) not null default 0,
  reward_usd numeric(18, 2) not null default 0,
  nonce integer not null default 0,
  difficulty integer not null default 1,
  status varchar(24) not null default 'Verified' check (status in ('Proposed', 'Verified')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists block_transactions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references mined_blocks(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  position integer not null,
  unique(block_id, transaction_id),
  unique(transaction_id)
);

create table if not exists mempool_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references transactions(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  asset_id uuid references coin_assets(id) on delete set null,
  status varchar(24) not null default 'Pending' check (status in ('Pending', 'Included', 'Rejected')),
  miner_reward_amount numeric(32, 18) not null default 0,
  miner_reward_usd numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  included_at timestamptz
);

create index if not exists idx_mempool_status_created on mempool_transactions(status, created_at desc);
create index if not exists idx_blocks_miner_created on mined_blocks(miner_user_id, created_at desc);

create table if not exists transaction_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  transaction_hash varchar(100) not null,
  status varchar(24) not null,
  block_number bigint,
  from_address varchar(64),
  to_address varchar(64),
  value_eth numeric(28, 18),
  gas_fee_eth numeric(28, 18),
  confirmations integer,
  verified_at timestamptz not null default now(),
  raw_payload jsonb
);

create index if not exists idx_verifications_hash on transaction_verifications(transaction_hash);
create index if not exists idx_verifications_user_verified on transaction_verifications(user_id, verified_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type varchar(40) not null,
  title varchar(120) not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tracked_coins (
  symbol varchar(12) primary key,
  name varchar(80) not null,
  coingecko_id varchar(80) not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coin_price_hourly_cache (
  id uuid primary key default gen_random_uuid(),
  symbol varchar(12) not null references tracked_coins(symbol) on delete cascade,
  coingecko_id varchar(80) not null,
  price_usd numeric(24, 8) not null,
  change_24h numeric(12, 6),
  hour_bucket timestamptz not null,
  source varchar(40) not null default 'coingecko',
  refreshed_at timestamptz not null default now(),
  unique(symbol, hour_bucket)
);

create index if not exists idx_coin_price_hourly_symbol_hour on coin_price_hourly_cache(symbol, hour_bucket desc);
create index if not exists idx_coin_price_hourly_hour on coin_price_hourly_cache(hour_bucket desc);

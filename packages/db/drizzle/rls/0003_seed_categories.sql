-- ════════════════════════════════════════════════════════════════════════════
-- DEFAULT SYSTEM CATEGORIES
-- ════════════════════════════════════════════════════════════════════════════
-- Categories with household_id = NULL are visible to all users (system-wide).
-- These are the starting set every new user can pick from in onboarding.
-- Bucket maps to the 50/30/20 methodology: needs / wants / savings.

-- Idempotent: skip if already seeded.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE household_id IS NULL LIMIT 1) THEN

    -- ─── EXPENSE / NEEDS ────────────────────────────────────────────────────
    INSERT INTO public.categories (household_id, name, icon, color, type, bucket, sort_order) VALUES
      (NULL, 'Housing',         'home',         '#3B82F6', 'expense', 'needs', '1010'),
      (NULL, 'Utilities',       'zap',          '#06B6D4', 'expense', 'needs', '1020'),
      (NULL, 'Groceries',       'shopping-cart','#10B981', 'expense', 'needs', '1030'),
      (NULL, 'Transportation',  'car',          '#6366F1', 'expense', 'needs', '1040'),
      (NULL, 'Healthcare',      'heart-pulse',  '#EF4444', 'expense', 'needs', '1050'),
      (NULL, 'Insurance',       'shield',       '#8B5CF6', 'expense', 'needs', '1060'),
      (NULL, 'Childcare',       'baby',         '#F59E0B', 'expense', 'needs', '1070'),
      (NULL, 'Education',       'book-open',    '#0EA5E9', 'expense', 'needs', '1080');

    -- ─── EXPENSE / WANTS ────────────────────────────────────────────────────
    INSERT INTO public.categories (household_id, name, icon, color, type, bucket, sort_order) VALUES
      (NULL, 'Dining Out',      'utensils',     '#F97316', 'expense', 'wants', '2010'),
      (NULL, 'Entertainment',   'film',         '#EC4899', 'expense', 'wants', '2020'),
      (NULL, 'Shopping',        'shopping-bag', '#A855F7', 'expense', 'wants', '2030'),
      (NULL, 'Travel',          'plane',        '#14B8A6', 'expense', 'wants', '2040'),
      (NULL, 'Hobbies',         'palette',      '#F43F5E', 'expense', 'wants', '2050'),
      (NULL, 'Subscriptions',   'repeat',       '#84CC16', 'expense', 'wants', '2060'),
      (NULL, 'Personal Care',   'sparkles',     '#D946EF', 'expense', 'wants', '2070'),
      (NULL, 'Gifts',           'gift',         '#FB7185', 'expense', 'wants', '2080');

    -- ─── EXPENSE / SAVINGS ──────────────────────────────────────────────────
    INSERT INTO public.categories (household_id, name, icon, color, type, bucket, sort_order) VALUES
      (NULL, 'Emergency Fund',  'piggy-bank',   '#22C55E', 'expense', 'savings', '3010'),
      (NULL, 'Investments',     'trending-up',  '#16A34A', 'expense', 'savings', '3020'),
      (NULL, 'Retirement',      'sunset',       '#15803D', 'expense', 'savings', '3030'),
      (NULL, 'Debt Repayment',  'credit-card',  '#DC2626', 'expense', 'savings', '3040'),
      (NULL, 'Long-term Goals', 'target',       '#059669', 'expense', 'savings', '3050');

    -- ─── EXPENSE / OTHER ────────────────────────────────────────────────────
    INSERT INTO public.categories (household_id, name, icon, color, type, bucket, sort_order) VALUES
      (NULL, 'Taxes',           'landmark',     '#64748B', 'expense', 'needs', '1090'),
      (NULL, 'Bank Fees',       'banknote',     '#94A3B8', 'expense', 'needs', '1100'),
      (NULL, 'Other',           'circle',       '#6B7280', 'expense', NULL,    '9999');

    -- ─── INCOME ─────────────────────────────────────────────────────────────
    INSERT INTO public.categories (household_id, name, icon, color, type, bucket, sort_order) VALUES
      (NULL, 'Salary',          'briefcase',    '#10B981', 'income',  NULL, '0010'),
      (NULL, 'Freelance',       'laptop',       '#0EA5E9', 'income',  NULL, '0020'),
      (NULL, 'Business',        'building',     '#8B5CF6', 'income',  NULL, '0030'),
      (NULL, 'Investment Gains','trending-up',  '#22C55E', 'income',  NULL, '0040'),
      (NULL, 'Rental Income',   'key',          '#F59E0B', 'income',  NULL, '0050'),
      (NULL, 'Refunds',         'undo-2',       '#06B6D4', 'income',  NULL, '0060'),
      (NULL, 'Gifts Received',  'gift',         '#EC4899', 'income',  NULL, '0070'),
      (NULL, 'Other Income',    'plus-circle',  '#6B7280', 'income',  NULL, '0099');

  END IF;
END $$;

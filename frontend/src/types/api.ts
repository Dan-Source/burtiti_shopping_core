export type Pagination = {
  count: number;
  next: string | null;
  previous: string | null;
};

export type PaginatedResponse<T> = Pagination & {
  results: T[];
};

export type Product = {
  id: number;
  title?: string;
  name: string;
  upc?: string;
  slug?: string;
  url?: string;
  description?: string;
  price?: {
    currency: string;
    excl_tax: string;
    incl_tax: string;
  };
  discountedPrice?: string;
  discountPercentage?: number;
  images?: string[];
  category?: {
    id: string | number;
    name: string;
    parentId?: string | number | null;
  };
  stock?: number;
  rating?: number;
  reviewsCount?: number;
  isNew?: boolean;
  isOnSale?: boolean;
  installments?: number;
  brand?: string;
  attributes?: Record<string, unknown>;
  image?: string | null;
};

export type ProductFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  brands?: string[];
  inStock?: boolean;
  onSale?: boolean;
  ordering?: string;
};

export type CategoryTree = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  count: number;
  children?: CategoryTree[];
};

export type ProductFilterState = {
  search: string;
  categories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  inStock: boolean;
  onSale: boolean;
};

export type CartLine = {
  id: number;
  product: Product;
  quantity: number;
  price_incl_tax?: string;
  price_excl_tax?: string;
};

export type Cart = {
  id: number;
  owner?: number;
  total_incl_tax?: string;
  total_excl_tax?: string;
  lines: CartLine[];
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password1: string;
  password2: string;
};

export type AuthTokens = {
  access: string;
  refresh?: string;
};

export type RefreshTokenPayload = {
  refresh: string;
};

export type OrderLine = {
  id: number;
  product: Product;
  quantity: number;
  line_price_incl_tax?: string;
};

export type Order = {
  id: number;
  number?: string;
  status: string;
  payment_status?: string;
  date_placed?: string;
  total_incl_tax?: string;
  url?: string;
  pix_qr_code?: string | null;
  pix_qr_code_image?: string | null;
  pix_copy_paste?: string | null;
  pix_expires_at?: string | null;
  lines?: OrderLine[];
};

export type Country = {
  iso_3166_1_a2: string;
  printable_name: string;
};

export type ShippingAddressPayload = {
  full_name: string;
  street: string;
  number?: string;
  bairro: string;
  city: string;
  state: string;
  cep: string;
  phone?: string;
};

export type CreateOrderPayload = {
  shipping_address?: ShippingAddressPayload;
  billing_address?: ShippingAddressPayload;
  shipping_method_code?: string;
  payment_method_code?: string;
  guest_email?: string;
};

export type PaymentMethod = {
  code: string;
  name?: string;
  label?: string;
  description?: string;
};

export type ShippingMethod = {
  code: string;
  name: string;
  price_incl_tax?: string;
};

export type CheckoutStep = "shipping-address" | "payment-method" | "review" | "pix";

export type PixState = {
  orderId?: number;
  status: "pending" | "paid" | "expired";
  qrCode: string;
  copyPasteKey: string;
};

export type PostcodeLookupState = {
  postcode: string;
  city: string;
  state: string;
};

export type CheckoutState = {
  step: CheckoutStep;
  guest_email: string;
  shipping_address: ShippingAddressPayload;
  shipping_method_code: string;
  payment_method_code: string;
  pix: PixState;
  postcode_lookup: PostcodeLookupState;
};

export type UserProfile = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type UpdateProfilePayload = Partial<Pick<UserProfile, "first_name" | "last_name">>;

export type UserAddress = {
  id: number;
  title: string;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  city: string;
  state: string;
  postcode: string;
  phone_number: string;
  notes: string;
  search_text: string;
  is_default_for_shipping: boolean;
  is_default_for_billing: boolean;
  country: string;
  url: string;
};

export type CreateAddressPayload = {
  first_name: string;
  last_name: string;
  line1: string;
  line2?: string;
  line3?: string;
  line4: string;
  city: string;
  state: string;
  postcode: string;
  phone_number?: string;
  title?: string;
  notes?: string;
  is_default_for_shipping?: boolean;
  is_default_for_billing?: boolean;
};

export type AddressCountResponse = {
  count: number;
};


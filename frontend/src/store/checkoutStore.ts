import { create } from "zustand";
import type {
  CheckoutState,
  CheckoutStep,
  PixState,
  PostcodeLookupState,
  ShippingAddressPayload,
} from "@/types/api";

type CheckoutStore = {
  state: CheckoutState;
  setField: <K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) => void;
  setAddressField: <K extends keyof ShippingAddressPayload>(
    field: K,
    value: ShippingAddressPayload[K],
  ) => void;
  setPostcodeLookup: (value: PostcodeLookupState) => void;
  setPixState: (value: Partial<PixState>) => void;
  setStep: (step: CheckoutStep) => void;
  reset: () => void;
};

const initialAddress: ShippingAddressPayload = {
  full_name: "",
  street: "",
  number: "",
  bairro: "",
  city: "",
  state: "",
  cep: "",
  phone: "",
};

const initialPixState: PixState = {
  status: "pending",
  qrCode: "",
  copyPasteKey: "",
};

const initialPostcodeLookup: PostcodeLookupState = {
  postcode: "",
  city: "",
  state: "",
};

const initialState: CheckoutState = {
  step: "shipping-address",
  guest_email: "",
  shipping_address: initialAddress,
  shipping_method_code: "",
  payment_method_code: "",
  pix: initialPixState,
  postcode_lookup: initialPostcodeLookup,
};

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  state: initialState,
  setField: (field, value) =>
    set((current) => ({
      state: {
        ...current.state,
        [field]: value,
      },
    })),
  setAddressField: (field, value) =>
    set((current) => ({
      state: {
        ...current.state,
        shipping_address: {
          ...current.state.shipping_address,
          [field]: value,
        },
      },
    })),
  setPostcodeLookup: (value) =>
    set((current) => ({
      state: {
        ...current.state,
        postcode_lookup: value,
      },
    })),
  setPixState: (value) =>
    set((current) => ({
      state: {
        ...current.state,
        pix: {
          ...current.state.pix,
          ...value,
        },
      },
    })),
  setStep: (step) =>
    set((current) => ({
      state: {
        ...current.state,
        step,
      },
    })),
  reset: () => set({ state: initialState }),
}));

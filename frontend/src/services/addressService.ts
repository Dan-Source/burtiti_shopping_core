import { apiClient } from "@/lib/api";
import { apiEndpoints } from "@/lib/api/endpoints";
import type {
  AddressCountResponse,
  Country,
  CreateAddressPayload,
  PaginatedResponse,
  UserAddress,
} from "@/types/api";

export type PostcodeLookupResult = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export const addressService = {
  getCountries() {
    return apiClient.get<Country[]>(apiEndpoints.countries, {
      metadata: { source: "addressService.getCountries" },
    });
  },

  getUserAddresses() {
    return apiClient.get<UserAddress[] | PaginatedResponse<UserAddress>>(
      apiEndpoints.userAddresses,
      {
        metadata: { source: "addressService.getUserAddresses" },
      },
    );
  },

  createAddress(payload: CreateAddressPayload) {
    return apiClient.post<UserAddress>(apiEndpoints.userAddresses, {
      body: payload,
      metadata: { source: "addressService.createAddress" },
    });
  },

  updateAddress(id: number, payload: Partial<CreateAddressPayload>) {
    return apiClient.put<UserAddress>(apiEndpoints.userAddress(id), {
      body: payload,
      metadata: { source: "addressService.updateAddress" },
    });
  },

  deleteAddress(id: number) {
    return apiClient.delete<void>(apiEndpoints.userAddress(id), {
      metadata: { source: "addressService.deleteAddress" },
    });
  },

  getAddressesCount() {
    return apiClient.get<AddressCountResponse>(apiEndpoints.userAddressesCount, {
      metadata: { source: "addressService.getAddressesCount" },
    });
  },

  async lookupPostcode(postcode: string, signal?: AbortSignal) {
    const normalizedPostcode = postcode.replace(/\D/g, "");

    const response = await fetch(`https://viacep.com.br/ws/${normalizedPostcode}/json/`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Postcode lookup failed");
    }

    return (await response.json()) as PostcodeLookupResult;
  },
};

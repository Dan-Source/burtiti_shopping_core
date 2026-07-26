"use client";

import { Spinner } from "@/components/feedback/spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { addressService } from "@/services";
import type {
  CreateAddressPayload,
  PostcodeLookupState,
  ShippingAddressPayload,
  ShippingMethod,
  UserAddress,
} from "@/types/api";
import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";

type ShippingAddressStepProps = {
  guestEmail: string;
  address: ShippingAddressPayload;
  postcodeLookup: PostcodeLookupState;
  selectedShippingMethod: string;
  shippingMethods: ShippingMethod[];
  loadingShippingMethods?: boolean;
  savedAddresses?: UserAddress[];
  isLoadingAddresses?: boolean;
  selectedAddressId?: number | null;
  userEmail?: string;
  isAuthenticated?: boolean;
  isSavingAddress?: boolean;
  isDeletingAddress?: boolean;
  onGuestEmailChange: (value: string) => void;
  onAddressChange: <K extends keyof ShippingAddressPayload>(
    field: K,
    value: ShippingAddressPayload[K],
  ) => void;
  onPostcodeLookupChange: (value: PostcodeLookupState) => void;
  onShippingMethodChange: (value: string) => void;
  onSelectSavedAddress?: (address: UserAddress) => void;
  onNewAddress?: () => void;
  onSaveNewAddress?: (data: CreateAddressPayload) => void;
  onUpdateAddress?: (id: number, data: Partial<CreateAddressPayload>) => void;
  onDeleteAddress?: (id: number) => void;
  onContinue: () => void;
};

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function addressToCreatePayload(addr: ShippingAddressPayload): CreateAddressPayload {
  const nameParts = addr.full_name.split(" ");
  const firstName = nameParts[0] || addr.full_name;
  const lastName = nameParts.slice(1).join(" ") || "";
  const numberParts = (addr.number || "").split(" ");
  const line2 = numberParts[0] || "";
  const line3 = numberParts.slice(1).join(" ") || "";

  return {
    first_name: firstName,
    last_name: lastName,
    line1: addr.street,
    line2,
    line3,
    line4: addr.bairro,
    city: addr.city,
    state: addr.state,
    postcode: addr.cep.replace(/\D/g, ""),
    phone_number: addr.phone ? addr.phone.replace(/\D/g, "") : undefined,
  };
}

function userAddressToAddressPayload(addr: UserAddress): ShippingAddressPayload {
  const fullName = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
  const numberParts = [addr.line2, addr.line3].filter(Boolean).join(" ");

  return {
    full_name: fullName,
    street: addr.line1 || "",
    number: numberParts,
    bairro: addr.line4 || "",
    city: addr.city || "",
    state: addr.state || "",
    cep: addr.postcode || "",
    phone: addr.phone_number || "",
  };
}

export function ShippingAddressStep({
  guestEmail,
  address,
  postcodeLookup,
  selectedShippingMethod,
  shippingMethods,
  loadingShippingMethods,
  savedAddresses,
  isLoadingAddresses,
  selectedAddressId,
  userEmail,
  isAuthenticated,
  isSavingAddress,
  isDeletingAddress,
  onGuestEmailChange,
  onAddressChange,
  onPostcodeLookupChange,
  onShippingMethodChange,
  onSelectSavedAddress,
  onNewAddress,
  onSaveNewAddress,
  onUpdateAddress,
  onDeleteAddress,
  onContinue,
}: ShippingAddressStepProps) {
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const lookupControllerRef = useRef<AbortController | null>(null);
  const activeLookupPostcodeRef = useRef("");
  const [autoFilledFields, setAutoFilledFields] = useState({
    street: false,
    bairro: false,
    city: false,
    state: false,
  });
  const hasShownMissingDetailsToast = useRef(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [showSaveNewPrompt, setShowSaveNewPrompt] = useState(false);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<number | null>(null);
  const hasAutoFilledEmail = useRef(false);

  const normalizedCep = address.cep.replace(/\D/g, "");
  const visiblePostcodeDetails =
    normalizedCep.length === 8 && postcodeLookup.postcode === normalizedCep
      ? postcodeLookup
      : null;
  const hasValidCep = normalizedCep.length === 8;
  const isAddressUnlocked = hasValidCep;

  const emailSource = isAuthenticated && userEmail ? userEmail : null;

  useEffect(() => {
    if (emailSource && !guestEmail && !hasAutoFilledEmail.current) {
      hasAutoFilledEmail.current = true;
      onGuestEmailChange(emailSource);
    }
  }, [emailSource, guestEmail, onGuestEmailChange]);

  const runPostcodeLookup = useCallback(
    async (postcode: string) => {
      if (postcode.length !== 8) {
        return;
      }

      if (postcodeLookup.postcode === postcode || activeLookupPostcodeRef.current === postcode) {
        return;
      }

      lookupControllerRef.current?.abort();
      const controller = new AbortController();
      lookupControllerRef.current = controller;
      activeLookupPostcodeRef.current = postcode;
      setIsLookingUpCep(true);

      try {
        const data = await addressService.lookupPostcode(postcode, controller.signal);

        if (data.erro) {
          onPostcodeLookupChange({ postcode: "", city: "", state: "" });
          setAutoFilledFields({ street: false, bairro: false, city: false, state: false });
          toast.error("CEP invalido", "Nao foi possivel localizar o endereco para esse CEP.");
          return;
        }

        const street = data.logradouro || "";
        const neighborhood = data.bairro || "";
        const city = data.localidade || "";
        const state = data.uf || "";

        onPostcodeLookupChange({
          postcode,
          city,
          state,
        });
        onAddressChange("cep", data.cep || address.cep);
        onAddressChange("street", street);
        onAddressChange("bairro", neighborhood);
        onAddressChange("city", city);
        onAddressChange("state", state);
        setAutoFilledFields({
          street: Boolean(street),
          bairro: Boolean(neighborhood),
          city: Boolean(city),
          state: Boolean(state),
        });

        if (!street && !neighborhood && !hasShownMissingDetailsToast.current) {
          hasShownMissingDetailsToast.current = true;
          toast.success(
            "CEP localizado",
            "Cidade e UF foram identificadas. Complete logradouro e bairro manualmente.",
          );
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        onPostcodeLookupChange({ postcode: "", city: "", state: "" });
        setAutoFilledFields({ street: false, bairro: false, city: false, state: false });
        console.error(error);
        toast.error(
          "Falha ao buscar CEP",
          "Nao foi possivel preencher o endereco automaticamente.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLookingUpCep(false);
        }

        if (lookupControllerRef.current === controller) {
          lookupControllerRef.current = null;
        }

        if (activeLookupPostcodeRef.current === postcode) {
          activeLookupPostcodeRef.current = "";
        }
      }
    },
    [
      address.cep,
      onAddressChange,
      onPostcodeLookupChange,
      postcodeLookup.postcode,
    ],
  );

  const handleFullNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onAddressChange("full_name", event.target.value);
    },
    [onAddressChange],
  );

  const handleCepChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      hasShownMissingDetailsToast.current = false;
      setIsLookingUpCep(false);
      setAutoFilledFields({ street: false, bairro: false, city: false, state: false });
      onPostcodeLookupChange({ postcode: "", city: "", state: "" });
      onAddressChange("cep", formatCep(event.target.value));
    },
    [onAddressChange, onPostcodeLookupChange],
  );

  const handleCepKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Tab") {
        return;
      }

      const tabPostcode = event.currentTarget.value.replace(/\D/g, "").slice(0, 8);
      if (tabPostcode.length === 8) {
        void runPostcodeLookup(tabPostcode);
      }
    },
    [runPostcodeLookup],
  );

  const handlePhoneChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatBrazilianPhone(event.target.value);
      onAddressChange("phone", formatted);
    },
    [onAddressChange],
  );

  const handleEditAddress = useCallback(
    (addr: UserAddress) => {
      setEditingAddressId(addr.id);
      const payload = userAddressToAddressPayload(addr);
      onAddressChange("full_name", payload.full_name);
      onAddressChange("street", payload.street);
      onAddressChange("number", payload.number || "");
      onAddressChange("bairro", payload.bairro);
      onAddressChange("city", payload.city);
      onAddressChange("state", payload.state);
      onAddressChange("cep", payload.cep);
      onAddressChange("phone", payload.phone || "");
      onPostcodeLookupChange({
        postcode: (addr.postcode || "").replace(/\D/g, ""),
        city: addr.city || "",
        state: addr.state || "",
      });
    },
    [onAddressChange, onPostcodeLookupChange],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingAddressId(null);
    onNewAddress?.();
  }, [onNewAddress]);

  const handleSaveEdit = useCallback(() => {
    if (!editingAddressId) {
      return;
    }

    const data = addressToCreatePayload(address);
    onUpdateAddress?.(editingAddressId, data);
    setEditingAddressId(null);
  }, [editingAddressId, address, onUpdateAddress]);

  const handleDeleteConfirm = useCallback(
    (id: number) => {
      onDeleteAddress?.(id);
      setShowDeleteConfirmId(null);
      if (selectedAddressId === id) {
        onNewAddress?.();
      }
    },
    [onDeleteAddress, onNewAddress, selectedAddressId],
  );

  const handleSaveNewAddress = useCallback(() => {
    const data = addressToCreatePayload(address);
    onSaveNewAddress?.(data);
    setShowSaveNewPrompt(false);
  }, [address, onSaveNewAddress]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onContinue();
  }

  useEffect(() => {
    if (normalizedCep.length !== 8) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runPostcodeLookup(normalizedCep);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedCep, runPostcodeLookup]);

  useEffect(() => {
    return () => {
      lookupControllerRef.current?.abort();
    };
  }, []);

  const isAddressComplete =
    Boolean(address.full_name) &&
    Boolean(address.street) &&
    Boolean(address.bairro) &&
    normalizedCep.length === 8;

  const isEditing = editingAddressId !== null;

  const showForm = isEditing || selectedAddressId === null || !isAddressComplete;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {savedAddresses && savedAddresses.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Enderecos salvos</h2>
              <p className="text-sm text-zinc-600">
                Escolha um endereco ja cadastrado ou preencha um novo.
              </p>
            </div>
          </div>

          {isLoadingAddresses ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Spinner /> Carregando enderecos...
            </p>
          ) : (
            <div className="space-y-2">
              {savedAddresses.map((addr) => {
                const fullName = [addr.first_name, addr.last_name].filter(Boolean).join(" ");

                return (
                  <div
                    key={addr.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                      selectedAddressId === addr.id && !editingAddressId
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200",
                    )}
                  >
                    <input
                      type="radio"
                      name="saved_address"
                      checked={selectedAddressId === addr.id && !editingAddressId}
                      onChange={() => {
                        if (editingAddressId) {
                          setEditingAddressId(null);
                        }
                        onSelectSavedAddress?.(addr);
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {fullName}
                        {addr.title ? ` - ${addr.title}` : ""}
                      </p>
                      <p className="truncate text-sm text-zinc-600">
                        {[addr.line1, addr.line2, addr.line4, addr.city, addr.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {addr.postcode ? (
                        <p className="text-xs text-zinc-500">CEP: {addr.postcode}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {addr.is_default_for_shipping ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Principal
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleEditAddress(addr)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        title="Editar endereco"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        </svg>
                      </button>
                      {showDeleteConfirmId === addr.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(addr.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50"
                            title="Confirmar exclusao"
                            disabled={isDeletingAddress}
                          >
                            {isDeletingAddress ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14"/>
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirmId(null)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
                            title="Cancelar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18"/>
                              <path d="m6 6 12 12"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirmId(addr.id)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500"
                          title="Remover endereco"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  selectedAddressId === null && !editingAddressId
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300",
                )}
              >
                <input
                  type="radio"
                  name="saved_address"
                  checked={selectedAddressId === null && !editingAddressId}
                  onChange={() => {
                    setEditingAddressId(null);
                    onNewAddress?.();
                  }}
                />
                <span className="text-sm font-medium text-zinc-700">
                  Usar um novo endereco
                </span>
              </label>
            </div>
          )}
        </Card>
      ) : (
        <p className="text-sm text-zinc-500">
          Nenhum endereco salvo. Preencha os dados abaixo para continuar.
        </p>
      )}

      {showForm ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEditing ? "Editar endereco" : "Endereco de entrega"}
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              required
              autoComplete="name"
              placeholder="Nome completo"
              value={address.full_name}
              onChange={handleFullNameChange}
              className="md:col-span-2"
            />

            {emailSource ? (
              <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>
                  Email para contato: <strong>{emailSource}</strong>
                </span>
              </div>
            ) : (
              <Input
                required
                type="email"
                autoComplete="email"
                placeholder="Email para contato"
                value={guestEmail}
                onChange={(event) => onGuestEmailChange(event.target.value)}
                className="md:col-span-2"
              />
            )}

            <Input
              placeholder="Telefone"
              autoComplete="tel-national"
              inputMode="numeric"
              maxLength={15}
              value={formatBrazilianPhone(address.phone || "")}
              onChange={handlePhoneChange}
              className="md:col-span-2"
            />

            <Input
              required
              placeholder="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              value={address.cep}
              onChange={handleCepChange}
              onKeyDown={handleCepKeyDown}
              className="md:col-span-2"
            />

            <Input
              required
              placeholder="Logradouro"
              value={address.street}
              onChange={(event) => {
                setAutoFilledFields((current) => ({ ...current, street: false }));
                onAddressChange("street", event.target.value);
              }}
              disabled={!isAddressUnlocked}
              className={cn(
                autoFilledFields.street && "border-emerald-300 bg-emerald-50 focus:ring-emerald-200",
              )}
            />

            <Input
              placeholder="Numero"
              value={address.number || ""}
              onChange={(event) => onAddressChange("number", event.target.value)}
              disabled={!isAddressUnlocked}
            />

            <Input
              required
              placeholder="Bairro"
              value={address.bairro}
              onChange={(event) => {
                setAutoFilledFields((current) => ({ ...current, bairro: false }));
                onAddressChange("bairro", event.target.value);
              }}
              disabled={!isAddressUnlocked}
              className={cn(
                autoFilledFields.bairro && "border-emerald-300 bg-emerald-50 focus:ring-emerald-200",
              )}
            />

            {isLookingUpCep ? (
              <p className="-mt-1 flex items-center gap-1 text-xs text-zinc-500 md:col-span-2">
                <Spinner /> Buscando endereco pelo CEP...
              </p>
            ) : null}

            <Input
              readOnly
              placeholder="Cidade"
              value={visiblePostcodeDetails?.city || ""}
              disabled={!isAddressUnlocked}
              className={cn(
                autoFilledFields.city && "border-emerald-300 bg-emerald-50 focus:ring-emerald-200",
              )}
            />

            <Input
              readOnly
              placeholder="UF"
              value={visiblePostcodeDetails?.state || ""}
              disabled={!isAddressUnlocked}
              className={cn(
                autoFilledFields.state && "border-emerald-300 bg-emerald-50 focus:ring-emerald-200",
              )}
            />
          </div>
        </Card>
      ) : selectedAddressId !== null ? (
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">Endereco de entrega</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => onNewAddress?.()}>
              Alterar endereco
            </Button>
          </div>
          <p className="text-sm font-medium text-zinc-900">{address.full_name}</p>
          <p className="text-sm text-zinc-700">
            {address.street}
            {address.number ? `, ${address.number}` : ""}
            {address.bairro ? ` - ${address.bairro}` : ""}
          </p>
          <p className="text-sm text-zinc-700">
            {address.city}{address.state ? ` - ${address.state}` : ""}
          </p>
          <p className="text-sm text-zinc-500">CEP: {address.cep}</p>
          {address.phone ? (
            <p className="text-sm text-zinc-500">Tel: {address.phone}</p>
          ) : null}
          {emailSource ? (
            <p className="text-sm text-zinc-500">Email: {emailSource}</p>
          ) : null}
        </Card>
      ) : null}

      {isEditing ? (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleCancelEdit}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSavingAddress}
          >
            {isSavingAddress ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        </div>
      ) : null}

      {!isEditing && showForm && savedAddresses && savedAddresses.length === 0 && isAddressComplete && !showSaveNewPrompt ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowSaveNewPrompt(true)}
          >
            Salvar endereco na minha conta
          </Button>
        </div>
      ) : null}

      {!isEditing && showSaveNewPrompt ? (
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowSaveNewPrompt(false)}
          >
            Nao salvar
          </Button>
          <Button
            type="button"
            onClick={handleSaveNewAddress}
            disabled={isSavingAddress}
          >
            {isSavingAddress ? "Salvando..." : "Salvar endereco"}
          </Button>
        </div>
      ) : null}

      <Card className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Metodo de entrega</h3>

        {loadingShippingMethods ? (
          <p className="text-sm text-zinc-600">Carregando opcoes de frete...</p>
        ) : null}

        {shippingMethods.map((method) => (
          <label
            key={method.code}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 p-3"
          >
            <span className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="shipping_method_code"
                checked={selectedShippingMethod === method.code}
                onChange={() => onShippingMethodChange(method.code)}
              />
              {method.name}
            </span>
            <span className="text-sm font-medium text-zinc-900">
              {method.price_incl_tax || "A calcular"}
            </span>
          </label>
        ))}
      </Card>

      <div className="flex justify-end">
        {!isEditing ? (
          <Button type="submit">Continuar para pagamento</Button>
        ) : null}
      </div>
    </form>
  );
}

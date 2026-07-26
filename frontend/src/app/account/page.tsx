"use client";

import { Button, Card, Input, Modal, OrderHistory, Section, Spinner, toast } from "@/components";
import {
  useCreateAddress,
  useDeleteAddress,
  useLogout,
  useOrders,
  useProfile,
  useUpdateAddress,
  useUserAddresses,
} from "@/hooks";
import type { CreateAddressPayload, UserAddress } from "@/types/api";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

const emptyForm: CreateAddressPayload = {
  first_name: "",
  last_name: "",
  line1: "",
  line2: "",
  line3: "",
  line4: "",
  city: "",
  state: "",
  postcode: "",
  phone_number: "",
  title: "",
};

function AddressForm({
  data,
  onChange,
  disabled,
}: {
  data: CreateAddressPayload;
  onChange: (patch: Partial<CreateAddressPayload>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Input
        required
        placeholder="Nome"
        value={data.first_name}
        onChange={(e) => onChange({ first_name: e.target.value })}
        disabled={disabled}
      />
      <Input
        required
        placeholder="Sobrenome"
        value={data.last_name}
        onChange={(e) => onChange({ last_name: e.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Apelido (ex: Casa, Trabalho)"
        value={data.title || ""}
        onChange={(e) => onChange({ title: e.target.value })}
        disabled={disabled}
        className="md:col-span-2"
      />
      <Input
        required
        placeholder="Logradouro"
        value={data.line1}
        onChange={(e) => onChange({ line1: e.target.value })}
        disabled={disabled}
        className="md:col-span-2"
      />
      <Input
        placeholder="Numero"
        value={data.line2 || ""}
        onChange={(e) => onChange({ line2: e.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Complemento"
        value={data.line3 || ""}
        onChange={(e) => onChange({ line3: e.target.value })}
        disabled={disabled}
      />
      <Input
        required
        placeholder="Bairro"
        value={data.line4}
        onChange={(e) => onChange({ line4: e.target.value })}
        disabled={disabled}
      />
      <Input
        required
        placeholder="Cidade"
        value={data.city}
        onChange={(e) => onChange({ city: e.target.value })}
        disabled={disabled}
      />
      <Input
        required
        placeholder="UF"
        maxLength={2}
        value={data.state}
        onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
        disabled={disabled}
      />
      <Input
        required
        placeholder="CEP"
        inputMode="numeric"
        maxLength={9}
        value={data.postcode}
        onChange={(e) => onChange({ postcode: e.target.value.replace(/\D/g, "").slice(0, 8) })}
        disabled={disabled}
      />
      <Input
        placeholder="Telefone"
        inputMode="numeric"
        maxLength={11}
        value={data.phone_number || ""}
        onChange={(e) => onChange({ phone_number: e.target.value.replace(/\D/g, "").slice(0, 11) })}
        disabled={disabled}
      />
    </div>
  );
}

function formatAddress(addr: UserAddress): string {
  const parts = [
    addr.first_name,
    addr.last_name,
    addr.line1,
    addr.line2,
    addr.line3,
    addr.line4,
    addr.city,
    addr.state,
    addr.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function AccountPage() {
  const profile = useProfile();
  const orders = useOrders();
  const logout = useLogout();
  const router = useRouter();
  const { data: addresses, isLoading: loadingAddresses } = useUserAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<CreateAddressPayload>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  async function onLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  const openNewModal = useCallback(() => {
    setEditingAddress(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((addr: UserAddress) => {
    setEditingAddress(addr);
    setForm({
      first_name: addr.first_name,
      last_name: addr.last_name,
      line1: addr.line1,
      line2: addr.line2 || "",
      line3: addr.line3 || "",
      line4: addr.line4,
      city: addr.city,
      state: addr.state,
      postcode: addr.postcode,
      phone_number: addr.phone_number || "",
      title: addr.title || "",
    });
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ id: editingAddress.id, data: form });
        toast.success("Endereco atualizado", "Endereco atualizado com sucesso.");
      } else {
        await createAddress.mutateAsync(form);
        toast.success("Endereco criado", "Novo endereco salvo com sucesso.");
      }
      setModalOpen(false);
    } catch {
      toast.error("Erro", "Nao foi possivel salvar o endereco.");
    }
  }, [editingAddress, form, createAddress, updateAddress]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteAddress.mutateAsync(id);
        toast.success("Endereco removido", "Endereco removido com sucesso.");
        setDeleteConfirmId(null);
      } catch {
        toast.error("Erro", "Nao foi possivel remover o endereco.");
      }
    },
    [deleteAddress],
  );

  const isPending = createAddress.isPending || updateAddress.isPending || deleteAddress.isPending;

  return (
    <Section className="space-y-5 py-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900">Minha conta</h1>
          <Button onClick={onLogout} disabled={logout.isPending} variant="secondary">
            {logout.isPending ? "Saindo..." : "Sair"}
          </Button>
        </div>

        <div className="mt-6 space-y-2 text-sm text-zinc-700">
          <p>
            <span className="font-medium">Email:</span> {profile.data?.email || "Nao disponivel"}
          </p>
          <p>
            <span className="font-medium">Nome:</span> {profile.data?.first_name || "-"}{" "}
            {profile.data?.last_name || ""}
          </p>
          {profile.isLoading ? (
            <p className="flex items-center gap-2">
              <Spinner className="h-4 w-4" /> Carregando perfil...
            </p>
          ) : null}
          {profile.isError ? (
            <p className="text-red-600">Nao foi possivel carregar o perfil.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">Meus enderecos</h2>
          <Button variant="secondary" size="sm" onClick={openNewModal}>
            Adicionar endereco
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {loadingAddresses ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Spinner className="h-4 w-4" /> Carregando enderecos...
            </p>
          ) : null}

          {!loadingAddresses && (!addresses || addresses.length === 0) ? (
            <p className="text-sm text-zinc-600">Nenhum endereco salvo.</p>
          ) : null}

          {addresses?.map((addr) => (
            <div
              key={addr.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">
                  {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                  {addr.title ? ` - ${addr.title}` : ""}
                </p>
                <p className="text-sm text-zinc-600">{formatAddress(addr)}</p>
                {addr.is_default_for_shipping || addr.is_default_for_billing ? (
                  <div className="mt-1 flex gap-2">
                    {addr.is_default_for_shipping ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Padrao para entrega
                      </span>
                    ) : null}
                    {addr.is_default_for_billing ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Padrao para cobranca
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEditModal(addr)}>
                  Editar
                </Button>
                {deleteConfirmId === addr.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(addr.id)}
                      disabled={isPending}
                    >
                      {deleteAddress.isPending ? "Removendo..." : "Confirmar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(addr.id)}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-zinc-900">Meus pedidos</h2>
        <div className="mt-4">
          {orders.data?.length ? (
            <OrderHistory orders={orders.data} />
          ) : (
            <p className="text-sm text-zinc-600">Nenhum pedido encontrado.</p>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={editingAddress ? "Editar endereco" : "Novo endereco"}
        description="Preencha os dados do endereco."
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <AddressForm
            data={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            disabled={isPending}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

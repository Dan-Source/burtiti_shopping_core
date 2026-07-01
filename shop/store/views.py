from __future__ import annotations

from django.contrib import messages
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, redirect
from oscar.core.loading import get_model

Product = get_model("catalogue", "Product")


def _session_cart(request: HttpRequest) -> dict:
	cart = request.session.get("cart", {})
	request.session["cart"] = cart
	return cart


def cart_add(request: HttpRequest, slug: str) -> HttpResponse:
	product = get_object_or_404(Product, slug=slug, is_public=True)
	stockrecord = product.stockrecords.first()
	if not stockrecord or stockrecord.num_in_stock <= 0:
		messages.error(request, "Produto sem estoque")
		return redirect("cart-detail")

	cart = _session_cart(request)
	item_key = str(product.id)
	entry = cart.get(item_key, {"title": product.get_title(), "quantity": 0})
	entry["quantity"] += 1
	cart[item_key] = entry
	request.session.modified = True

	messages.success(request, f"{product.get_title()} foi adicionado ao carrinho")
	return redirect("cart-detail")


def cart_update(request: HttpRequest, slug: str) -> HttpResponse:
	product = get_object_or_404(Product, slug=slug, is_public=True)
	cart = _session_cart(request)
	item_key = str(product.id)

	quantity_raw = request.POST.get("quantity", "1")
	try:
		quantity = int(quantity_raw)
	except (TypeError, ValueError):
		quantity = 1

	if quantity <= 0:
		cart.pop(item_key, None)
		request.session.modified = True
		messages.success(request, f"{product.get_title()} foi removido do carrinho")
		return redirect("cart-detail")

	cart[item_key] = {"title": product.get_title(), "quantity": quantity}
	request.session.modified = True
	messages.success(request, f"Quantidade atualizada para {quantity}")
	return redirect("cart-detail")


def cart_detail(request: HttpRequest) -> HttpResponse:
	cart = _session_cart(request)
	html_parts = ["<html><body>"]

	for message in messages.get_messages(request):
		html_parts.append(f"<p>{message}</p>")

	for item in cart.values():
		title = item.get("title", "")
		quantity = item.get("quantity", 0)
		html_parts.append(f"<div>{title}</div>")
		html_parts.append(f'<input type="number" value="{quantity}">')

	html_parts.append("</body></html>")
	return HttpResponse("".join(html_parts))

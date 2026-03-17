type InvoiceItemLike = {
  quantity?: number | null;
  unitPrice?: number | null;
  total?: number | null;
  product?: { name?: string | null } | null;
};

type InvoiceCustomerLike = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type InvoiceLike = {
  id: string;
  invoiceNumber?: string | null;
  totalAmount?: number | null;
  paymentMethod?: string | null;
  status?: string | null;
  createdAt: string;
  sale?: {
    items?: InvoiceItemLike[] | null;
    customer?: InvoiceCustomerLike | null;
  } | null;
  salesOrder?: {
    items?: InvoiceItemLike[] | null;
    customer?: InvoiceCustomerLike | null;
  } | null;
  store?: { name?: string | null; location?: string | null } | null;
};

const toCurrency = (value?: number | null) => Number(value || 0).toFixed(2);

let templateCache: string | null = null;

const loadTemplate = async () => {
  if (templateCache) return templateCache;

  const response = await fetch("/invoice-template.html", { cache: "no-store" });
  const template = await response.text();
  templateCache = template;
  return template;
};

export const buildInvoiceHtml = async (invoiceData: InvoiceLike) => {
  const template = await loadTemplate();
  const items = invoiceData.sale?.items || invoiceData.salesOrder?.items || [];
  const customer = invoiceData.sale?.customer || invoiceData.salesOrder?.customer;
  const storeName =
    invoiceData.store?.name && invoiceData.store.name !== "Default Store"
      ? invoiceData.store.name
      : "KHTAB Engineering & Services";
  const storeLocation = invoiceData.store?.location || "";
  const invoiceNumber = invoiceData.invoiceNumber || invoiceData.id.substring(0, 8);
  const invoiceDate = new Date(invoiceData.createdAt).toLocaleDateString("en-GB");
  const subtotal = items.reduce((sum, item) => sum + Number(item?.total || 0), 0);
  const tax = 0;
  const total = invoiceData.totalAmount || subtotal + tax;
  const statusLabel = invoiceData.sale ? "PAID" : (invoiceData.status || "UNPAID");

  const itemRows = items.length
    ? items
        .map((item, index) =>
          [
            "<tr>",
            `<td>${index + 1}</td>`,
            `<td>${item?.product?.name || "N/A"}</td>`,
            `<td class=\"text-right\">PKR ${toCurrency(item?.unitPrice)}</td>`,
            `<td class=\"text-right\">${Number(item?.quantity || 0)}</td>`,
            `<td class=\"text-right\">PKR ${toCurrency(item?.total)}</td>`,
            "</tr>",
          ].join("")
        )
        .join("")
    : "<tr><td colspan=\"5\" class=\"text-right\">No items</td></tr>";

  const customerPhoneRow = customer?.phone
    ? `<div class=\"meta-line\">Phone: ${customer.phone}</div>`
    : "";
  const customerEmailRow = customer?.email
    ? `<div class=\"meta-line\">Email: ${customer.email}</div>`
    : "";

  return template
    .replaceAll("{{storeName}}", storeName)
    .replaceAll("{{storeLocation}}", storeLocation)
    .replaceAll("{{invoiceNumber}}", invoiceNumber)
    .replaceAll("{{invoiceDate}}", invoiceDate)
    .replaceAll("{{customerName}}", customer?.name || "Walk-in")
    .replaceAll("{{customerPhoneRow}}", customerPhoneRow)
    .replaceAll("{{customerEmailRow}}", customerEmailRow)
    .replaceAll("{{paymentMethod}}", invoiceData.paymentMethod || "-")
    .replaceAll("{{statusLabel}}", statusLabel)
    .replaceAll("{{itemsRows}}", itemRows)
    .replaceAll("{{subtotal}}", toCurrency(subtotal))
    .replaceAll("{{tax}}", toCurrency(tax))
    .replaceAll("{{total}}", toCurrency(total));
};

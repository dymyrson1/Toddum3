import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import { db } from "./firebase.js";

// ---------- HELPERS ----------

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    return orderA - orderB;
  });
}

// ---------- CUSTOMERS ----------

export async function getCustomers() {
  const snapshot = await getDocs(collection(db, "customers"));

  const customers = snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));

  return sortByOrder(customers);
}

export async function addCustomer(name) {
  return addDoc(collection(db, "customers"), {
    name: name.trim(),
    active: true,
    order: Date.now(),
    createdAt: serverTimestamp(),
  });
}

export async function updateCustomer(id, data) {
  const ref = doc(db, "customers", id);

  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteCustomer(id) {
  return updateCustomer(id, {
    active: false,
  });
}

export async function restoreCustomer(id) {
  return updateCustomer(id, {
    active: true,
  });
}

// ---------- PRODUCTS ----------

export async function getProducts() {
  const snapshot = await getDocs(collection(db, "products"));

  const products = snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));

  return sortByOrder(products);
}

export async function addProduct(name) {
  return addDoc(collection(db, "products"), {
    name: name.trim(),
    active: true,
    order: Date.now(),
    packaging: [],
    createdAt: serverTimestamp(),
  });
}

export async function updateProduct(id, data) {
  const ref = doc(db, "products", id);

  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteProduct(id) {
  return updateProduct(id, {
    active: false,
  });
}

export async function restoreProduct(id) {
  return updateProduct(id, {
    active: true,
  });
}

// ---------- PACKAGING ----------

export async function addPackaging(productId, name, weightGrams) {
  const ref = doc(db, "products", productId);

  const products = await getProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const newPackaging = {
    id: crypto.randomUUID(),
    name: name.trim(),
    weightGrams: Number(weightGrams),
  };

  return updateDoc(ref, {
    packaging: [...(product.packaging || []), newPackaging],
    updatedAt: serverTimestamp(),
  });
}

export async function updatePackaging(
  productId,
  packagingId,
  name,
  weightGrams,
) {
  const ref = doc(db, "products", productId);

  const products = await getProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const updatedPackaging = (product.packaging || []).map((packaging) => {
    if (packaging.id !== packagingId) {
      return packaging;
    }

    return {
      ...packaging,
      name: name.trim(),
      weightGrams: Number(weightGrams),
    };
  });

  return updateDoc(ref, {
    packaging: updatedPackaging,
    updatedAt: serverTimestamp(),
  });
}

export async function removePackaging(productId, packagingId) {
  const ref = doc(db, "products", productId);

  const products = await getProducts();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const updatedPackaging = (product.packaging || []).filter(
    (packaging) => packaging.id !== packagingId,
  );

  return updateDoc(ref, {
    packaging: updatedPackaging,
    updatedAt: serverTimestamp(),
  });
}

// ---------- WEEKS ----------

export function getISOWeekId(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;

  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();

  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

// ---------- ORDERS ----------

export async function getOrdersByWeek(weekId) {
  const q = query(collection(db, "orders"), where("weekId", "==", weekId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function getOrderItemsByOrderIds(orderIds) {
  if (!orderIds.length) return [];

  const chunks = [];

  for (let i = 0; i < orderIds.length; i += 10) {
    chunks.push(orderIds.slice(i, i + 10));
  }

  const results = [];

  for (const chunk of chunks) {
    const q = query(
      collection(db, "orderItems"),
      where("orderId", "in", chunk),
    );
    const snapshot = await getDocs(q);

    results.push(
      ...snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })),
    );
  }

  return results;
}

export async function ensureOrder(customerId, weekId) {
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", customerId),
    where("weekId", "==", weekId),
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const document = snapshot.docs[0];

    return {
      id: document.id,
      ...document.data(),
    };
  }

  const ref = await addDoc(collection(db, "orders"), {
    customerId,
    weekId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    customerId,
    weekId,
  };
}

export async function setOrderItem({
  orderId,
  productId,
  packagingId,
  quantity,
}) {
  const normalizedQuantity = Number(quantity);

  const q = query(
    collection(db, "orderItems"),
    where("orderId", "==", orderId),
    where("productId", "==", productId),
    where("packagingId", "==", packagingId),
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const document = snapshot.docs[0];

    return updateDoc(doc(db, "orderItems", document.id), {
      quantity: normalizedQuantity > 0 ? normalizedQuantity : 0,
      updatedAt: serverTimestamp(),
    });
  }

  if (normalizedQuantity <= 0) return;

  return addDoc(collection(db, "orderItems"), {
    orderId,
    productId,
    packagingId,
    quantity: normalizedQuantity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrderItemsByOrderId(orderId) {
  const q = query(
    collection(db, "orderItems"),
    where("orderId", "==", orderId),
  );

  const snapshot = await getDocs(q);

  const deletes = snapshot.docs.map((document) =>
    deleteDoc(doc(db, "orderItems", document.id)),
  );

  return Promise.all(deletes);
}

export async function deleteOrder(orderId) {
  await deleteOrderItemsByOrderId(orderId);
  return deleteDoc(doc(db, "orders", orderId));
}

// ============================================
// 0. حماية اللوحة: لا جلسة = رجوع لصفحة الدخول
// ============================================
async function guardAdminPage() {
  const { data } = await supabaseAuthClient.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

async function setupAuth() {
  const ok = await guardAdminPage();
  if (!ok) return;

  // لو الجلسة اتنهت والمستخدم لسه فاتح الصفحة، ارميه للدخول
  supabaseAuthClient.auth.onAuthStateChange((_event, session) => {
    if (!session) window.location.href = "login.html";
  });

  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!confirm("هل تريد تسجيل الخروج؟")) return;
      await supabaseAuthClient.auth.signOut();
      window.location.href = "login.html";
    });
  }
}

// ============================================
// 1. تبديل التبويبات (الطلبات / الوجبات)
// ============================================
function setupTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      document.getElementById("ordersSection").classList.toggle("hidden", target !== "orders");
      document.getElementById("productsSection").classList.toggle("hidden", target !== "products");
    });
  });
}

// ============================================
// 2. الوجبات - جلب وعرض في جدول الوجبات
// ============================================
let productsCache = [];

async function loadAdminProducts() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#aaa;">جاري التحميل...</td></tr>`;

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    productsCache = data || [];
    tbody.innerHTML = "";

    if (productsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#aaa;">لا توجد وجبات حالياً</td></tr>`;
      return;
    }

    productsCache.forEach((p) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><img src="${p.image || 'https://via.placeholder.com/50'}" width="50" height="50" style="object-fit:cover; border-radius:6px;" /></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category || '-'}</td>
        <td>${p.price} جنيه</td>
        <td>
          <button class="action-btn btn-edit" onclick="editProduct(${p.id})">تعديل</button>
          <button class="action-btn btn-delete" onclick="deleteProduct(${p.id})">حذف</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#ef5350;">حدث خطأ أثناء التحميل</td></tr>`;
    console.error("Error loading products:", err);
  }
}

// ============================================
// 3. حذف وجبة
// ============================================
async function deleteProduct(id) {
  if (!confirm("هل أنت متأكد من حذف هذه الوجبة؟")) return;
  try {
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;
    loadAdminProducts();
  } catch (err) {
    alert("حدث خطأ أثناء الحذف: " + err.message);
  }
}

// ============================================
// 4. تعديل وجبة - تعبئة النموذج بالبيانات
// ============================================
function editProduct(id) {
  const p = productsCache.find((item) => item.id === id);
  if (!p) return;

  document.getElementById("productId").value = p.id;
  document.getElementById("pName").value = p.name || "";
  document.getElementById("pCategory").value = p.category || "";
  document.getElementById("pPrice").value = p.price || "";
  document.getElementById("pImage").value = p.image || "";
  document.getElementById("pDescription").value = p.description || "";

  document.getElementById("formTitle").textContent = "تعديل الوجبة";
  document.getElementById("saveProductBtn").textContent = "حفظ التعديلات";
  document.getElementById("cancelEditBtn").classList.remove("hidden");

  document.getElementById("productForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ============================================
// 5. إلغاء وضع التعديل وإعادة تعيين النموذج
// ============================================
function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("formTitle").textContent = "إضافة وجبة جديدة";
  document.getElementById("saveProductBtn").textContent = "حفظ الوجبة";
  document.getElementById("cancelEditBtn").classList.add("hidden");
}

// ============================================
// 6. أحداث النموذج: إضافة أو تعديل حسب وجود ID
// ============================================
function setupAdminEvents() {
  const form = document.getElementById("productForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productData = {
      name: document.getElementById("pName").value.trim(),
      category: document.getElementById("pCategory").value.trim(),
      price: parseFloat(document.getElementById("pPrice").value),
      image: document.getElementById("pImage").value.trim(),
      description: document.getElementById("pDescription").value.trim()
    };

    const productId = document.getElementById("productId").value;

    try {
      let error;
      if (productId) {
        ({ error } = await supabaseClient
          .from("products")
          .update(productData)
          .eq("id", productId));
      } else {
        ({ error } = await supabaseClient.from("products").insert([productData]));
      }

      if (error) throw error;

      resetProductForm();
      loadAdminProducts();
      alert(productId ? "تم حفظ التعديلات بنجاح!" : "تمت إضافة الوجبة بنجاح!");
    } catch (err) {
      alert("خطأ أثناء الحفظ: " + err.message);
    }
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetProductForm);
}

// ============================================
// 7. جلب وعرض الطلبات في جدول الطلبات
// ============================================
async function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#aaa;">لا توجد طلبات مستلمة حتى الآن</td></tr>`;
      return;
    }

    data.forEach((o) => {
      const clientName = o.customer_name || "بدون اسم";
      const phone = o.customer_phone || "-";
      const address = o.customer_address || "-";
      const totalValue = Number(o.total_price) || 0;
      const status = o.status || "جديد";

      let parsedItems = [];
      if (Array.isArray(o.items)) {
        parsedItems = o.items;
      } else if (typeof o.items === "string") {
        try { parsedItems = JSON.parse(o.items); } catch (e) { parsedItems = []; }
      }

      const itemsText = parsedItems.length > 0
        ? parsedItems.map((i) => `${i.name || "وجبة"} (×${i.quantity || 1})`).join(" ، ")
        : "لا توجد تفاصيل أصناف";

      let badgeBg = "#2196F3";
      if (status === "جاري التحضير") badgeBg = "#FF9800";
      if (status === "تم التوصيل") badgeBg = "#4CAF50";
      if (status === "ملغي") badgeBg = "#f44336";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>#${o.id}</strong></td>
        <td>
          <div style="font-weight:bold; color:#fff; font-size:14px;">${clientName}</div>
          <div style="font-size:11px; color:#f39c12; margin-top:3px;">🛒 ${itemsText}</div>
          ${o.notes ? `<div style="font-size:11px; color:#aaa; margin-top:3px;">📝 ${o.notes}</div>` : ""}
        </td>
        <td style="direction:ltr;">${phone}</td>
        <td>${address}</td>
        <td><strong style="color:#27ae60; font-size:14px;">${totalValue} جنيه</strong></td>
        <td><span style="background:${badgeBg}; color:#fff; padding:3px 8px; border-radius:4px; font-size:12px; white-space:nowrap;">${status}</span></td>
        <td style="font-size:12px; color:#ccc; white-space:nowrap;">${new Date(o.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
        <td>
          <div style="display:flex; gap:5px; align-items:center;">
            <select onchange="updateOrderStatus(${o.id}, this.value)" style="background:#2a2a2a; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; cursor:pointer;">
              <option value="">تغيير...</option>
              <option value="جديد" ${status === "جديد" ? "selected" : ""}>جديد</option>
              <option value="جاري التحضير" ${status === "جاري التحضير" ? "selected" : ""}>جاري التحضير</option>
              <option value="تم التوصيل" ${status === "تم التوصيل" ? "selected" : ""}>تم التوصيل</option>
              <option value="ملغي" ${status === "ملغي" ? "selected" : ""}>ملغي</option>
            </select>
            <button onclick="deleteOrder(${o.id})" style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;" title="حذف الطلب">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading orders:", err);
  }
}

// ============================================
// 8. تحديث حالة الطلب
// ============================================
async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;
  try {
    const { error } = await supabaseClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw error;
    loadOrders();
  } catch (err) {
    alert("تعذر تحديث الحالة: " + err.message);
  }
}

// ============================================
// 9. حذف طلب
// ============================================
async function deleteOrder(orderId) {
  if (!confirm(`هل أنت متأكد من حذف الطلب رقم #${orderId}؟`)) return;
  try {
    const { error } = await supabaseClient.from("orders").delete().eq("id", orderId);
    if (error) throw error;
    loadOrders();
  } catch (err) {
    alert("تعذر حذف الطلب: " + err.message);
  }
}

// ============================================
// 10. إشعار فوري (Toast) + صوت تنبيه
// ============================================
function showToast(title, body) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="toast-icon">🔔</span>
    <div><strong>${title}</strong><span>${body}</span></div>
  `;
  // الضغط على الإشعار يرجعك لقسم الطلبات ويخفيه
  toast.addEventListener("click", () => {
    document.querySelector('[data-tab="orders"]')?.click();
    hideToast(toast);
  });
  container.appendChild(toast);

  setTimeout(() => hideToast(toast), 8000);
}

function hideToast(toast) {
  toast.classList.add("hide");
  setTimeout(() => toast.remove(), 350);
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    });
  } catch (e) { /* المتصفح منع الصوت — الإشعار المرئي يكفي */ }
}

// ============================================
// 11. الاشتراك في Realtime: أي طلب جديد يظهر لوحده
// ============================================
function subscribeToOrdersRealtime() {
  const indicator = document.getElementById("realtimeIndicator");
  const indicatorText = document.getElementById("realtimeText");

  const channel = supabaseClient
    .channel("orders-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "orders" },
      (payload) => {
        const o = payload.new || {};
        playNotificationSound();
        showToast(
          `طلب جديد #${o.id || ""}`,
          `${o.customer_name || "عميل"} — ${Number(o.total_price) || 0} جنيه`
        );
        loadOrders(); // تحديث الجدول فوراً
      }
    )
    .subscribe((status) => {
      if (!indicator) return;
      if (status === "SUBSCRIBED") {
        indicator.classList.add("connected");
        indicator.classList.remove("disconnected");
        if (indicatorText) indicatorText.textContent = "إشعارات مباشرة";
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        indicator.classList.add("disconnected");
        indicator.classList.remove("connected");
        if (indicatorText) indicatorText.textContent = "انقطع الاتصال — حدّث الصفحة";
      }
    });

  // تنظيف عند إغلاق الصفحة
  window.addEventListener("beforeunload", () => {
    supabaseClient.removeChannel(channel);
  });
}

// ============================================
// تشغيل عند التحميل
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  await setupAuth(); // لو مش مسجل دخول هيتم تحويله فوراً
  setupTabs();
  setupAdminEvents();
  loadAdminProducts();
  loadOrders();
  subscribeToOrdersRealtime();
});

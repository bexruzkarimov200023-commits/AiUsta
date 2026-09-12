const S = {
  user: null,
  page: "home",
  category: "Konditsioner",
  diagnoses: [],
  masters: [],
  parts: [],
};
const cats = [
  ["Konditsioner", "❄", "Sovutish"],
  ["Avtomobil", "🚗", "Transport"],
  ["Kompyuter", "💻", "Texnika"],
  ["Telefon", "📱", "Gadjet"],
  ["Santexnika", "🚿", "Uy"],
  ["Elektr", "⚡", "Tarmoq"],
  ["Uy jihozlari", "⌂", "Maishiy"],
];
const languages = {
  uz: {
    nav: [
      "Bosh sahifa",
      "AI suhbat",
      "Diagnostikalarim",
      "Ustalar",
      "Account",
      "Ehtiyot qismlar",
      "Biz haqimizda",
    ],
    dark: "Qora rejim",
    light: "Yorug' rejim",
    help: "Yordam kerakmi?",
  },
  ru: {
    nav: [
      "Главная",
      "AI чат",
      "Диагностика",
      "Мастера",
      "Аккаунт",
      "Запчасти",
      "О нас",
    ],
    dark: "Темная тема",
    light: "Светлая тема",
    help: "Нужна помощь?",
  },
  en: {
    nav: [
      "Home",
      "AI chat",
      "My diagnostics",
      "Specialists",
      "Account",
      "Parts",
      "About",
    ],
    dark: "Dark mode",
    light: "Light mode",
    help: "Need help?",
  },
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const AUTH_USER_KEY = "usta_user";
const AUTH_SESSION_KEY = "usta_session";

function persistAuthState(user, token) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }

  if (token) {
    localStorage.setItem(AUTH_SESSION_KEY, token);
    sessionStorage.setItem(AUTH_SESSION_KEY, token);
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
}

function restoreAuthState() {
  const savedUser =
    localStorage.getItem(AUTH_USER_KEY) ||
    sessionStorage.getItem(AUTH_USER_KEY);
  const sessionToken =
    localStorage.getItem(AUTH_SESSION_KEY) ||
    sessionStorage.getItem(AUTH_SESSION_KEY);

  if (savedUser) {
    try {
      S.user = JSON.parse(savedUser);
    } catch {
      S.user = null;
    }
  }

  if (sessionToken && !localStorage.getItem(AUTH_SESSION_KEY)) {
    localStorage.setItem(AUTH_SESSION_KEY, sessionToken);
  }

  if (sessionToken && !sessionStorage.getItem(AUTH_SESSION_KEY)) {
    sessionStorage.setItem(AUTH_SESSION_KEY, sessionToken);
  }

  return { user: S.user, sessionToken: sessionToken };
}

function clearAuthState() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

const aboutNav = document.createElement("button");
aboutNav.className = "nav";
aboutNav.dataset.page = "about";
aboutNav.innerHTML = "ⓘ <span>About</span>";
document.querySelector("nav").appendChild(aboutNav);
const partsNav = document.createElement("button");
partsNav.className = "nav";
partsNav.dataset.page = "parts";
partsNav.innerHTML = "▣ <span>Ehtiyot qismlar</span>";
document.querySelector("nav").insertBefore(partsNav, aboutNav);
async function api(url, o = {}) {
  const token = localStorage.getItem("usta_session");
  const r = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(o.headers || {}),
    },
    ...o,
  });
  const b = await r.json();
  if (!r.ok) {
    const error = new Error(b.error);
    error.status = r.status;
    throw error;
  }
  return b;
}
function toast(x) {
  const t = $("#toast");
  t.textContent = x;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
function modal(id, show = true) {
  $("#" + id).classList.toggle("hidden", !show);
}
function shell() {
  const titles = {
    home: "Bosh sahifa",
    history: "Diagnostikalarim",
    masters: "Ustalar",
    account: "Account",
    about: "Biz haqimizda",
    admin: "Admin panel",
    parts: "Ehtiyot qismlar",
  };
  $("#crumb").textContent = titles[S.page];
  $$(".nav").forEach((n) =>
    n.classList.toggle("active", n.dataset.page === S.page),
  );
  if (S.page === "home") home();
  if (S.page === "chat") chat();
  if (S.page === "history") history();
  if (S.page === "masters") masters();
  if (S.page === "parts") partsStore();
  if (S.page === "account") account();
  if (S.page === "about") about();
  if (S.page === "admin") admin();
}
function account() {
  const isSpecialist = S.user.role === "specialist";
  $("#content").innerHTML =
    `<div class="page"><div class="heading"><div><span class="eyebrow">PROFIL</span><h1>Account</h1><p>Shaxsiy ma'lumotlar va platformadagi rolingiz.</p></div><span class="date">${isSpecialist ? "Usta profili" : "Mijoz profili"}</span></div><div class="account-grid"><section class="panel profile-panel"><div class="profile-large"><div class="avatar avatar-large">${S.user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()}</div><div><h2>${S.user.name}</h2><p>${S.user.email}</p><span class="badge">${isSpecialist ? "Usta" : S.user.role === "admin" ? "Administrator" : "Mijoz"}</span></div></div><div class="profile-details"><div><small>Ism</small><b>${S.user.name}</b></div><div><small>Email</small><b>${S.user.email}</b></div><div><small>Account ID</small><b>${S.user.id}</b></div></div><button class="primary" id="accountLogout">Accountdan chiqish <span>→</span></button></section><aside class="panel become-master"><span class="ai-avatar">✦</span><h3>${isSpecialist ? "Usta profilingiz faol" : "Usta bo'lib ishlang"}</h3><p>${isSpecialist ? "Siz yaqin mijozlar so'rovlarini qabul qilishingiz mumkin." : "Xizmatlaringizni joylang va yangi mijozlar toping."}</p>${isSpecialist ? '<button class="outline" disabled>Profil faol</button>' : '<button class="primary" id="becomeMaster">Usta bo\'lish →</button>'}</aside></div></div>`;
  $("#accountLogout").onclick = () => $("#logout").click();
  if ($("#becomeMaster"))
    $("#becomeMaster").onclick = () => {
      mode = "register";
      $(".optional").classList.remove("hidden");
      $(".specialist-only").classList.remove("hidden");
      $("#authForm input[name='specialist']").checked = true;
      $("#authTitle").textContent = "Usta bo'lib ro'yxatdan o'tish";
      $("#authText").textContent = "Yo'nalishingizni va emailingizni kiriting.";
      modal("auth");
    };
}
function about() {
  $("#content").innerHTML =
    `<div class="page"><div class="heading"><div><span class="eyebrow">USTAAI</span><h1>Muammoni ko'rsating, yechimni toping.</h1><p>AI diagnostika va ishonchli ustalar marketplace'i.</p></div></div><div class="about-grid"><section class="hero about-hero"><div><h2>Bitta platforma, barcha ta'mirlash ehtiyojlari.</h2><p>Konditsioner, avtomobil, telefon, kompyuter, elektr va santexnika bo'yicha yordam.</p></div></section><section class="panel about-list"><h3>Qanday ishlaydi?</h3><div class="about-step"><b>01</b><span><strong>Muammoni yuboring</strong><small>Rasm, video yoki ovozli xabar tashlang.</small></span></div><div class="about-step"><b>02</b><span><strong>AI tahlil qiladi</strong><small>Sabab, shoshilinchlik va narxni ko'rsatadi.</small></span></div><div class="about-step"><b>03</b><span><strong>Usta tanlang</strong><small>Yaqin va mos mutaxassis bilan bog'laning.</small></span></div></section></div></div>`;
}
function chat() {
  if (!S.user) {
    modal("auth");
    toast("Suhbatni boshlash uchun kiring");
    return;
  }
  $("#content").innerHTML =
    `<div class="page"><div class="heading"><div><span class="eyebrow">USTAAI ASSISTENT</span><h1>AI bilan gaplashing.</h1><p>Muammoni yozing, gapiring yoki surat yuboring.</p></div><span class="date">● Online</span></div><div class="chat-layout"><section class="chat-panel"><div class="chat-head"><div class="ai-avatar">✦</div><div><strong>UstaAI Assistant</strong><small>Texnik muammolar bo‘yicha yordamchi</small></div><span class="online-dot">●</span></div><div class="messages" id="messages"><div class="message bot">Salom! Men UstaAI yordamchisiman. Muammoingizni yozing yoki ovozli xabar yuboring. Surat ham qo‘shishingiz mumkin.</div></div><div class="chat-file-preview hidden" id="chatFileName"></div><form class="chat-form" id="chatForm"><label class="attach" title="Rasm yuborish">＋<input id="chatFile" type="file" accept="image/*,video/*"></label><input id="chatInput" autocomplete="off" placeholder="Masalan: konditsionerimdan suv oqyapti..."/><button type="button" class="voice-button" id="voiceButton" title="Gapiring">◉</button><button class="send-button" type="submit">→</button></form><div class="chat-tools"><button type="button" id="speakLast">🔊 Javobni eshittirish</button><span>Enter — yuborish</span></div></section><aside class="chat-side"><h3>Tezkor savollar</h3><button class="prompt" data-prompt="Konditsionerimdan suv oqyapti">❄️ Konditsioner suv oqizyapti</button><button class="prompt" data-prompt="Ta'mirlash narxi qancha bo'ladi?">💰 Taxminiy narxni ayting</button><button class="prompt" data-prompt="Yaqin usta chaqirmoqchiman">👨‍🔧 Yaqin usta kerak</button><div class="voice-card"><b>Ovozli yordam</b><p>Mikrofon tugmasini bosing va gapiring. Men matnga aylantiraman.</p><span>◉</span></div></aside></div></div>`;
  const messages = $("#messages");
  const addMessage = (text, type) => {
    const item = document.createElement("div");
    item.className = `message ${type}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  };
  const send = async (text) => {
    if (!text.trim()) return;
    addMessage(text, "user");
    $("#chatInput").value = "";
    try {
      const result = await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      addMessage(result.answer, "bot");
      window.lastAssistantAnswer = result.answer;
    } catch (error) {
      toast(error.message);
    }
  };
  $("#chatForm").onsubmit = (event) => {
    event.preventDefault();
    send($("#chatInput").value);
  };
  $$(".prompt").forEach(
    (button) => (button.onclick = () => send(button.dataset.prompt)),
  );
  $("#chatFile").onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      $("#chatFileName").textContent = `📎 ${file.name}`;
      $("#chatFileName").classList.remove("hidden");
      addMessage(`Rasm/video yuborildi: ${file.name}`, "user");
      send("Yuklangan suratdagi muammoni tahlil qiling");
    }
  };
  $("#speakLast").onclick = () => {
    if (window.lastAssistantAnswer && "speechSynthesis" in window)
      speechSynthesis.speak(
        new SpeechSynthesisUtterance(window.lastAssistantAnswer),
      );
    else toast("Avval AI javobini oling");
  };
  $("#voiceButton").onclick = () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition)
      return toast("Brauzeringiz ovozli kiritishni qo‘llamaydi");
    const recognition = new Recognition();
    recognition.lang =
      localStorage.language === "ru"
        ? "ru-RU"
        : localStorage.language === "en"
          ? "en-US"
          : "uz-UZ";
    recognition.onstart = () => toast("Eshityapman...");
    recognition.onresult = (event) => {
      $("#chatInput").value = event.results[0][0].transcript;
    };
    recognition.onerror = () => toast("Mikrofon ruxsati berilmadi");
    recognition.start();
  };
}
function home() {
  const root = $("#content");
  root.innerHTML = `<div class="page"><div class="heading"><div><span class="eyebrow">YORDAM MARKAZI</span><h1>Muammoingizni hal qilamiz.</h1><p>Rasm yoki video yuboring — UstaAI sababini topadi.</p></div><span class="date">Bugun, 10 sentabr 2026</span></div><section class="hero"><div><h2>Muammoni ko'rsating, <strong>yechimni toping.</strong></h2><p>AI diagnostika va ishonchli ustalar bir joyda.</p></div><button class="primary" id="start">Diagnostikani boshlash <span>→</span></button></section><div class="section-title"><h3>Qaysi sohada yordam kerak?</h3></div><div class="service-grid">${cats.map((c) => `<button class="service ${S.category === c[0] ? "selected" : ""}" data-cat="${c[0]}"><i>${c[1]}</i><strong>${c[0]}</strong><small>${c[2]}</small></button>`).join("")}</div><div class="work"><section class="upload"><div class="section-title"><h3>Muammoni yuklang</h3><span class="eyebrow">1-QADAM</span></div><div class="zone" id="zone"><div class="copy"><div class="upload-icon">↥</div><h4>Rasm yoki video shu yerga</h4><p>PNG, JPG yoki MP4 · maksimal 20 MB</p><div class="zone-actions"><label class="primary">Fayl tanlash <input id="file" type="file" accept="image/*,video/*"></label><button class="outline" id="camera">Kamera</button></div></div><img class="preview" id="preview" alt="Muammo"></div><button class="primary full" id="diagnose" style="margin-top:14px">AI bilan tahlil qilish <span>✦</span></button><div class="result" id="result"></div></section><aside class="stats"><h3>UstaAI qanday ishlaydi?</h3><div class="stat"><span><i class="dot"></i>Rasm orqali tahlil</span><b>AI</b></div><div class="stat"><span><i class="dot"></i>Aniqlik darajasi</span><b>82%</b></div><div class="stat"><span><i class="dot"></i>Javob vaqti</span><b>~ 30 soniya</b></div><div class="stat"><span><i class="dot"></i>Tekshirilgan ustalar</span><b>1 200+</b></div></aside></div><div class="section-title" style="margin-top:32px"><h3>So'nggi diagnostikalar</h3><button class="link" id="historyLink">Barchasini ko'rish →</button></div><div class="recent">${S.diagnoses.length ? S.diagnoses.slice(0, 3).map(card).join("") : ["Konditsioner", "Avtomobil", "Kompyuter"].map((x, i) => `<div class="card"><div class="thumb">${cats.find((c) => c[0] === x)[1]}</div><div><strong>${x} diagnostikasi</strong><small>${i + 2} kun oldin</small></div><span class="badge">Tayyor</span></div>`).join("")}</div></div>`;
  bindHome();
}
function card(d) {
  return `<div class="card"><div class="thumb">${(cats.find((c) => c[0] === d.category) || cats[0])[1]}</div><div><strong>${d.result.issue}</strong><small>${new Date(d.createdAt).toLocaleDateString("uz-UZ")}</small></div><span class="badge">${d.result.confidence}%</span></div>`;
}
function bindHome() {
  $$("[data-cat]").forEach(
    (b) =>
      (b.onclick = () => {
        S.category = b.dataset.cat;
        shell();
      }),
  );
  $("#start").onclick = () => $("#zone").scrollIntoView({ behavior: "smooth" });
  $("#historyLink").onclick = () => {
    S.page = "history";
    shell();
  };
  $("#file").onchange = (e) => file(e.target.files[0]);
  $("#camera").onclick = () => $("#file").click();
  const note = document.createElement("textarea");
  note.id = "problemNote";
  note.className = "problem-note";
  note.placeholder =
    "Muammoni shu yerga yozing: masalan, konditsionerimdan suv oqyapti...";
  note.rows = 3;
  $("#diagnose").before(note);
  $("#diagnose").onclick = diagnose;
  const z = $("#zone");
  z.ondragover = (e) => {
    e.preventDefault();
    z.classList.add("drag");
  };
  z.ondragleave = () => z.classList.remove("drag");
  z.ondrop = (e) => {
    e.preventDefault();
    z.classList.remove("drag");
    file(e.dataTransfer.files[0]);
  };
}
function file(f) {
  if (!f) return;
  if (f.type.startsWith("image/")) {
    $("#preview").src = URL.createObjectURL(f);
    $("#preview").classList.add("show");
    $("#zone").classList.add("has-preview");
  }
  toast("Fayl yuklandi");
}
async function diagnose() {
  if (!S.user) {
    modal("auth");
    toast("Avval tizimga kiring");
    return;
  }
  const b = $("#diagnose");
  b.disabled = true;
  b.innerHTML = "Tahlil qilinmoqda...";
  await new Promise((r) => setTimeout(r, 700));
  try {
    const x = await api("/api/diagnoses", {
      method: "POST",
      body: JSON.stringify({
        category: S.category,
        note: $("#problemNote")?.value.trim() || "",
      }),
    });
    S.diagnoses.unshift(x.diagnosis);
    const d = x.diagnosis;
    $("#result").innerHTML =
      `<div class="result-head"><div><span class="eyebrow">AI XULOSASI · ${d.category}</span><h3>${d.result.issue}</h3></div><span class="confidence">${d.result.confidence}% ehtimol</span></div><div class="result-info"><div><small>Kerakli ish</small><strong>${d.result.action}</strong></div><div><small>Taxminiy narx</small><strong>${d.result.price}</strong></div><div><small>Ta'mirlash</small><strong>${d.result.time}</strong></div><div><small>Shoshilinchlik</small><strong>${d.result.urgency}</strong></div></div><div class="result-foot"><div class="parts"><b>Ehtiyot qismlar:</b> ${d.result.parts.join(", ")}</div><button class="primary call">Usta chaqirish <span>→</span></button></div>`;
    $("#result").classList.add("show");
    $(".call").onclick = () => modal("contact");
    toast("AI tahlili tayyor");
  } catch (e) {
    toast(e.message);
  }
  b.disabled = false;
  b.innerHTML = "AI bilan tahlil qilish <span>✦</span>";
}
function history() {
  const rows = S.diagnoses
    .map(
      (d) =>
        `<tr><td><b>${d.result.issue}</b></td><td>${d.category}</td><td><span class="badge">${d.result.confidence}%</span></td><td>${d.result.urgency}</td><td>${new Date(d.createdAt).toLocaleDateString("uz-UZ")}</td></tr>`,
    )
    .join("");
  $("#content").innerHTML =
    `<div class="page"><div class="heading"><div><span class="eyebrow">ARXIV</span><h1>Diagnostikalarim</h1><p>Oldingi tahlillar va tavsiyalar bir joyda.</p></div><button class="primary" id="new">+ Yangi diagnostika</button></div><div class="panel"><div class="panel-head"><h3>Barcha so'rovlar</h3><span class="date">${S.diagnoses.length} ta natija</span></div>${rows ? `<table class="table"><thead><tr><th>Muammo</th><th>Yo'nalish</th><th>Aniqlik</th><th>Shoshilinchlik</th><th>Sana</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty"><h3>Hali diagnostika yo‘q</h3><p>Birinchi muammoni yuboring va AI tavsiyasini oling.</p></div>'}</div></div>`;
  $("#new").onclick = () => {
    S.page = "home";
    shell();
  };
}
function masters() {
  const ms = S.masters;
  const canAddMaster = S.user && ["specialist", "admin"].includes(S.user.role);
  $("#content").innerHTML =
    `<div class="page"><div class="heading"><div><span class="eyebrow">MARKETPLACE</span><h1>Yaqin ustalar</h1><p>Muammoingizga mos, tekshirilgan mutaxassislar.</p></div><div class="heading-actions"><span class="date">⌖ Toshkent, Chilonzor</span>${canAddMaster ? '<button class="primary" id="addMasterBtn">+ Usta qo\'shish</button>' : ""}</div></div><div class="masters">${ms.map((m) => `<article class="master card"><div class="master-top"><div class="master-avatar">${m.accent}</div><div><h3>${m.name}</h3><p>${m.specialty}</p></div></div><div class="online"><i></i>${m.available ? "Hozir mavjud" : "Band, keyinroq bog‘lanadi"}</div><div class="meta"><span>★ ${m.rating} · ${m.jobs} ish</span><span>${m.distance}</span></div><button class="primary full contact" data-name="${m.name}" style="margin-top:15px">Bog‘lanish <span>→</span></button></article>`).join("")}</div></div>`;
  $$(".contact").forEach(
    (b) =>
      (b.onclick = () => {
        $("#contactText").textContent =
          `${b.dataset.name} bilan bog'lanish uchun raqamingizni qoldiring.`;
        modal("contact");
      }),
  );
  $("#addMasterBtn") &&
    ($("#addMasterBtn").onclick = () => modal("specialistForm"));
}
function partsStore() {
  const categories = [
    "Barchasi",
    ...new Set(S.parts.map((part) => part.category)),
  ];
  const render = (category = "Barchasi", query = "") => {
    const items = S.parts.filter(
      (part) =>
        (category === "Barchasi" || part.category === category) &&
        `${part.name} ${part.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    $("#content").innerHTML =
      `<div class="page"><div class="heading"><div><span class="eyebrow">MARKETPLACE</span><h1>Ehtiyot qismlar</h1><p>Ustalar tavsiya qilgan ehtiyot qismlarni toping va buyurtma qiling.</p></div><span class="date">${S.parts.length} ta mahsulot</span></div><div class="parts-toolbar"><input id="partsSearch" placeholder="Qism nomini qidiring..."><div class="parts-tabs">${categories.map((item) => `<button class="outline ${item === category ? "selected" : ""}" data-part-category="${item}">${item}</button>`).join("")}</div></div><div class="parts-grid">${items.length ? items.map((part) => `<article class="part-card card"><div class="part-icon">${part.icon}</div><div class="part-copy"><span class="eyebrow">${part.category}</span><h3>${part.name}</h3><p>${part.description}</p><strong>${part.price.toLocaleString("uz-UZ")} so‘m</strong><small>${part.stock > 0 ? `${part.stock} dona mavjud` : "Sotilgan"}</small></div><button class="primary full buy-part" data-part-id="${part.id}" ${part.stock < 1 ? "disabled" : ""}>Buyurtma berish <span>→</span></button></article>`).join("") : '<div class="empty"><h3>Mahsulot topilmadi</h3><p>Boshqa nom yoki kategoriyani sinab ko‘ring.</p></div>'}</div></div>`;
    $("#partsSearch").value = query;
    $$("[data-part-category]").forEach(
      (button) =>
        (button.onclick = () => render(button.dataset.partCategory, query)),
    );
    $("#partsSearch").oninput = (event) => render(category, event.target.value);
    $$(".buy-part").forEach(
      (button) => (button.onclick = () => buyPart(button.dataset.partId)),
    );
  };
  render();
}
async function buyPart(partId) {
  if (!S.user) return modal("auth");
  try {
    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ partId, quantity: 1 }),
    });
    const part = S.parts.find((item) => item.id === partId);
    if (part) part.stock -= 1;
    toast("Buyurtma qabul qilindi. Usta siz bilan bog‘lanadi.");
    partsStore();
  } catch (error) {
    toast(error.message);
  }
}
async function admin() {
  try {
    const x = await api("/api/admin/stats");
    $("#content").innerHTML =
      `<div class="page"><div class="heading"><div><span class="eyebrow">BOSHQARUV MARKAZI</span><h1>Admin panel</h1><p>Platforma faolligi va foydalanuvchilarni boshqaring.</p></div><span class="date">Live ma'lumotlar</span></div><div class="admin-grid">${[
        ["Foydalanuvchilar", x.stats.users],
        ["Diagnostikalar", x.stats.diagnoses],
        ["Ustalar", x.stats.specialists],
        ["Zudlik bilan", x.stats.urgent],
      ]
        .map(
          (a) =>
            `<div class="admin-stat card"><small>${a[0]}</small><b>${a[1]}</b></div>`,
        )
        .join(
          "",
        )}</div><div class="panel"><div class="panel-head"><h3>Foydalanuvchilar ro'yxati</h3><button class="outline" onclick="admin()">Yangilash</button></div><table class="table"><thead><tr><th>Foydalanuvchi</th><th>Email</th><th>Rol</th><th>ID</th><th>Amal</th></tr></thead><tbody>${x.users.map((u) => `<tr><td><b>${u.name}</b></td><td>${u.email}</td><td><span class="badge">${u.role}</span></td><td>${u.id}</td><td>${u.id === S.user.id ? '<span class="muted-action">Siz</span>' : `<button class="delete-user" data-user-id="${u.id}">O'chirish</button>`}</td></tr>`).join("")}</tbody></table></div></div>`;
    $$(".delete-user").forEach(
      (button) => (button.onclick = () => deleteUser(button.dataset.userId)),
    );
  } catch (e) {
    $("#content").innerHTML =
      `<div class="page"><div class="empty"><h3>Admin huquqi kerak</h3><p>${e.message}</p><button class="primary" id="adminLogin">Admin sifatida kirish →</button></div></div>`;
    $("#adminLogin").onclick = () => modal("auth");
  }
}
async function deleteUser(userId) {
  if (!confirm("Bu foydalanuvchini o'chirishni tasdiqlaysizmi?")) return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    toast("Foydalanuvchi o'chirildi");
    admin();
  } catch (error) {
    toast(error.message);
  }
}
async function init() {
  restoreAuthState();

  try {
    const m = await api("/api/auth/me");
    if (!m.user && !S.user) return requireLogin();
    if (m.user) {
      S.user = m.user;
      persistAuthState(S.user, localStorage.getItem(AUTH_SESSION_KEY));
    }
    if (!S.user) return requireLogin();
    persistAuthState(S.user, localStorage.getItem(AUTH_SESSION_KEY));
    S.masters = (await api("/api/specialists")).specialists;
    S.parts = (await api("/api/parts")).parts;
    S.diagnoses = (await api("/api/diagnoses")).diagnoses;
    profile();
    shell();
  } catch (error) {
    if (!S.user) return requireLogin();
    profile();
    shell();
    toast("Account saqlandi. Ulanish qayta tiklanmoqda...");
  }
}
function requireLogin() {
  document.body.classList.add("auth-required");
  modal("auth");
}
function profile() {
  if (!S.user) return;
  $("#userName").textContent = S.user.name;
  $("#userRole").textContent =
    S.user.role === "admin"
      ? "Administrator"
      : S.user.role === "specialist"
        ? "Usta"
        : "Mijoz";
  $(".avatar").textContent = S.user.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function applyLanguage() {
  const language = localStorage.language || "uz";
  const copy = languages[language];
  document.documentElement.lang = language;
  if ($("#language")) $("#language").value = language;
  $$(".nav span").forEach(
    (item, index) => (item.textContent = copy.nav[index]),
  );
  const themeLabel = $("#theme span");
  if (themeLabel)
    themeLabel.textContent = document.body.classList.contains("dark")
      ? copy.light
      : copy.dark;
  const helpTitle = $("#help strong");
  if (helpTitle) helpTitle.textContent = copy.help;
}
$$(".nav").forEach(
  (n) =>
    (n.onclick = () => {
      if (!S.user && n.dataset.page !== "home") {
        modal("auth");
        toast("Davom etish uchun email kiriting");
        return;
      }
      S.page = n.dataset.page;
      $(".sidebar").classList.remove("open");
      shell();
    }),
);
$("#hamb").onclick = () => $(".sidebar").classList.toggle("open");
function toggleTheme() {
  document.body.classList.toggle("dark");
  applyLanguage();
  localStorage.theme = document.body.classList.contains("dark")
    ? "dark"
    : "light";
}
$("#theme").onclick = toggleTheme;
$("#themeTop").onclick = toggleTheme;
if (localStorage.theme === "dark") document.body.classList.add("dark");
$("#language").onchange = (event) => {
  localStorage.language = event.target.value;
  applyLanguage();
  toast(
    event.target.value === "uz"
      ? "Til o'zbekchaga o'zgartirildi"
      : event.target.value === "ru"
        ? "Язык изменен на русский"
        : "Language changed to English",
  );
};
$("#authForm input[name='specialist']").onchange = (event) =>
  $(".specialist-only").classList.toggle("hidden", !event.target.checked);
$("#help").onclick = () => modal("contact");
$$("[data-close]").forEach((b) => {
  b.onclick = () => {
    if (
      b.dataset.close === "auth" &&
      document.body.classList.contains("auth-required")
    )
      return;
    modal(b.dataset.close, false);
  };
});
let mode = "login";
let otpRequested = false;
function updateAuthFields() {
  const registering = mode === "register";
  $(".password-field").classList.toggle("hidden", !registering);
  $(".code-field").classList.toggle("hidden", registering || !otpRequested);
  $("#authSubmit").innerHTML = registering
    ? "Ro‘yxatdan o‘tish <span>→</span>"
    : otpRequested
      ? "Kodni tasdiqlash <span>→</span>"
      : "Kodni yuborish <span>→</span>";
}
$("#switch").onclick = () => {
  mode = mode === "login" ? "register" : "login";
  otpRequested = false;
  $(".optional").classList.toggle("hidden", mode === "login");
  $("#authTitle").textContent =
    mode === "login" ? "Xush kelibsiz" : "Hisob yarating";
  $("#authText").textContent =
    mode === "login"
      ? "Muammoni tezroq hal qilish uchun tizimga kiring."
      : "UstaAI bilan muammolaringizni tezroq hal qiling.";
  $(".role-choice").classList.toggle("hidden", mode === "login");
  $(".specialist-only").classList.add("hidden");
  updateAuthFields();
  $("#switch").innerHTML =
    mode === "login"
      ? "Hisobingiz yo‘qmi? <b>Ro‘yxatdan o‘ting</b>"
      : "Hisobingiz bormi? <b>Kiring</b>";
};
$("#authForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const form = Object.fromEntries(new FormData(e.target));
    if (mode === "login" && !otpRequested) {
      await api("/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      otpRequested = true;
      $("#authText").textContent =
        "Emailingizga yuborilgan 6 xonali kodni kiriting.";
      updateAuthFields();
      toast("Tasdiqlash kodi emailingizga yuborildi");
      return;
    }
    form.role = form.specialist ? "specialist" : "user";
    delete form.specialist;
    const endpoint =
      mode === "login" ? "/api/auth/verify-code" : "/api/auth/register";
    const r = await api(endpoint, {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (r.sessionToken) {
      persistAuthState(r.user, r.sessionToken);
    } else {
      persistAuthState(r.user, localStorage.getItem(AUTH_SESSION_KEY));
    }
    S.user = r.user;
    document.body.classList.remove("auth-required");
    profile();
    modal("auth", false);
    S.masters = (await api("/api/specialists")).specialists;
    S.parts = (await api("/api/parts")).parts;
    S.diagnoses = (await api("/api/diagnoses")).diagnoses;
    toast("Xush kelibsiz, " + S.user.name);
    if (S.user.role === "admin") S.page = "admin";
    else if (S.user.role === "specialist") S.page = "masters";
    shell();
  } catch (e) {
    toast(e.message);
  }
};
async function finishLogin(result) {
  S.user = result.user;
  if (result.sessionToken) {
    persistAuthState(S.user, result.sessionToken);
  } else {
    persistAuthState(S.user, localStorage.getItem(AUTH_SESSION_KEY));
  }
  document.body.classList.remove("auth-required");
  profile();
  modal("auth", false);
  api("/api/specialists").then((catalog) => {
    S.masters = catalog.specialists;
  });
  api("/api/parts").then((catalog) => {
    S.parts = catalog.parts;
  });
  api("/api/diagnoses").then((history) => {
    S.diagnoses = history.diagnoses;
  });
  if (S.user.role === "admin") S.page = "admin";
  else if (S.user.role === "specialist") S.page = "masters";
  toast("Xush kelibsiz, " + S.user.name);
  shell();
}
$$("[data-provider]").forEach(
  (button) =>
    (button.onclick = async () => {
      if (button.dataset.provider === "Google") {
        window.location.href = "/api/auth/google";
        return;
      }
      const email = $('#authForm input[name="email"]').value.trim();
      if (!email) {
        toast(`${button.dataset.provider} hisobingiz emailini kiriting`);
        $('#authForm input[name="email"]').focus();
        return;
      }
      if (!email) return;
      try {
        const result = await api("/api/auth/oauth", {
          method: "POST",
          body: JSON.stringify({
            provider: button.dataset.provider,
            email,
            name: email.split("@")[0],
          }),
        });
        finishLogin(result);
      } catch (error) {
        toast(error.message);
      }
    }),
);
$("#logout").onclick = async () => {
  if (S.user) {
    await api("/api/auth/logout", { method: "POST" });
    clearAuthState();
    S.user = null;
    S.diagnoses = [];
    $("#userName").textContent = "Mehmon";
    $("#userRole").textContent = "Kirish kerak";
    toast("Tizimdan chiqildi");
    S.page = "home";
    shell();
  }
};

window.addEventListener("storage", (event) => {
  if (event.key === AUTH_USER_KEY && !event.newValue) {
    S.user = null;
    return;
  }

  if (event.key === AUTH_USER_KEY && event.newValue) {
    try {
      S.user = JSON.parse(event.newValue);
    } catch {
      S.user = null;
    }
  }
});
$("#accountTrigger").onclick = () => {
  if (S.user) {
    S.page = "account";
    shell();
  } else modal("auth");
};
$("#contactForm").onsubmit = (e) => {
  e.preventDefault();
  modal("contact", false);
  toast("So‘rovingiz yuborildi. Usta tez orada bog‘lanadi.");
};
$("#specialistCreateForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!S.user || !["specialist", "admin"].includes(S.user.role)) {
    modal("specialistForm", false);
    modal("auth");
    toast("Usta qo‘shish uchun specialist sifatida kirish kerak");
    return;
  }

  const form = Object.fromEntries(new FormData(e.target));
  const payload = {
    name: String(form.name || "").trim(),
    specialty: String(form.specialty || "").trim(),
    distance: String(form.distance || "Yangi usta").trim() || "Yangi usta",
    available: String(form.available) === "true",
  };

  if (!payload.name || !payload.specialty) {
    toast("Ism va mutaxassislik maydonlari majburiy");
    return;
  }

  try {
    const result = await api("/api/specialists", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    S.masters = (await api("/api/specialists")).specialists;
    modal("specialistForm", false);
    e.target.reset();
    toast("Yangi usta katalogga qo‘shildi");
    if (S.page === "masters") shell();
    if (result.specialist) {
      S.masters.unshift(result.specialist);
    }
  } catch (error) {
    toast(error.message);
  }
};
applyLanguage();
const authError = new URLSearchParams(window.location.search).get("auth_error");
if (authError) toast(authError);
init().then(() => {
  if (S.user?.role === "admin") {
    S.page = "admin";
    shell();
  }
});

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data.json");
const TMP_DATA_FILE = path.join("/tmp", "ustaai-data.json");
const DATA_STORAGE_FILE = process.env.VERCEL ? TMP_DATA_FILE : DATA_FILE;
const sessions = new Map();
const otpChallenges = new Map();
const oauthStates = new Map();
const defaultParts = [
  {
    id: "part-1",
    name: "Universal konditsioner filtri",
    category: "Konditsioner",
    description: "Ko‘p turdagi split tizimlar uchun yuviladigan filtr.",
    price: 85000,
    stock: 18,
    icon: "❄",
  },
  {
    id: "part-2",
    name: "Drenaj shlangi 3 metr",
    category: "Konditsioner",
    description: "Suv oqishi muammosini bartaraf etish uchun mustahkam shlang.",
    price: 65000,
    stock: 24,
    icon: "〰",
  },
  {
    id: "part-3",
    name: "USB-C quvvat porti",
    category: "Telefon",
    description: "Ommabop Android telefonlar uchun almashtiriladigan modul.",
    price: 110000,
    stock: 12,
    icon: "⌁",
  },
  {
    id: "part-4",
    name: "Termopasta 5 g",
    category: "Kompyuter",
    description:
      "Protsessor va videokarta uchun yuqori issiqlik o‘tkazuvchi pasta.",
    price: 45000,
    stock: 31,
    icon: "◉",
  },
  {
    id: "part-5",
    name: "Klemma to‘plami",
    category: "Elektr",
    description: "Uy elektr tarmog‘i uchun izolyatsiyalangan ulash klemmasi.",
    price: 38000,
    stock: 40,
    icon: "⚡",
  },
  {
    id: "part-6",
    name: "FUM lenta va prokladka",
    category: "Santexnika",
    description: "Suv ulanishlarini zichlash uchun kundalik to‘plam.",
    price: 22000,
    stock: 55,
    icon: "◌",
  },
];

const defaultData = {
  users: [
    {
      id: "usr-1",
      name: "Platforma administratori",
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      password: process.env.ADMIN_PASSWORD || "",
      role: "admin",
    },
  ],
  diagnoses: [],
  specialists: [
    {
      id: "usta-1",
      name: "Jasur Usta",
      specialty: "Konditsioner va sovutish",
      rating: 4.9,
      jobs: 128,
      distance: "1.8 km",
      available: true,
      accent: "JA",
    },
    {
      id: "usta-2",
      name: "Sardor Service",
      specialty: "Elektr va maishiy texnika",
      rating: 4.8,
      jobs: 96,
      distance: "3.2 km",
      available: true,
      accent: "SS",
    },
    {
      id: "usta-3",
      name: "FixLab Usta",
      specialty: "Santexnika va uy jihozlari",
      rating: 4.7,
      jobs: 74,
      distance: "4.6 km",
      available: false,
      accent: "FU",
    },
  ],
};

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_STORAGE_FILE, "utf8");
    const saved = JSON.parse(raw);
    saved.users = (saved.users || []).filter(
      (user) => user.provider !== "Google",
    );
    const admin = saved.users?.find((user) => user.role === "admin");
    if (admin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      admin.email = process.env.ADMIN_EMAIL;
      admin.password = process.env.ADMIN_PASSWORD;
    }
    saved.sessions = saved.sessions || {};
    for (const [token, userId] of Object.entries(saved.sessions))
      sessions.set(token, userId);
    return saved;
  } catch {
    try {
      const fallback = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      fs.writeFileSync(DATA_STORAGE_FILE, JSON.stringify(fallback, null, 2));
      return fallback;
    } catch {
      fs.writeFileSync(DATA_STORAGE_FILE, JSON.stringify(defaultData, null, 2));
      return structuredClone(defaultData);
    }
  }
}
function saveData(data) {
  data.sessions = Object.fromEntries(sessions.entries());
  fs.writeFileSync(DATA_STORAGE_FILE, JSON.stringify(data, null, 2));
}
let data = loadData();
data.parts = data.parts || defaultParts;
data.orders = data.orders || [];

function send(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON noto'g'ri"));
      }
    });
    req.on("error", reject);
  });
}
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .filter(Boolean)
      .map((item) => {
        const [key, ...value] = item.trim().split("=");
        return [key, decodeURIComponent(value.join("="))];
      }),
  );
}
function currentUser(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = cookies(req).usta_session || bearer;
  const userId = token && (sessions.get(token) || data.sessions?.[token]);
  return data.users.find((user) => user.id === userId) || null;
}
function publicUser(user) {
  const { password, ...safe } = user;
  return safe;
}
function requireAuth(req, res, role) {
  const user = currentUser(req);
  if (!user || (role && user.role !== role)) {
    send(res, 401, { error: "Avtorizatsiya talab qilinadi" });
    return null;
  }
  return user;
}
function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}
function appOrigin(req) {
  return (
    process.env.APP_URL || `http://${req.headers.host || "localhost:3000"}`
  );
}
function createSession(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, user.id);
  saveData(data);
  return token;
}
function socialRedirectLogin(req, res, provider) {
  return redirect(
    res,
    "/?auth_error=" +
      encodeURIComponent(
        `${provider} orqali kirish uchun avval ro'yxatdan o'ting`,
      ),
  );
}
async function googleJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error_description || body.error || "Google autentifikatsiya xatosi",
    );
  return body;
}
async function sendOtpEmail(email, code) {
  const smtpConfigured =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;
  if (!smtpConfigured) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Email xizmati sozlanmagan");
    console.log(`UstaAI OTP for ${email}: ${code}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "UstaAI tasdiqlash kodi",
    text: `UstaAI hisobingiz uchun tasdiqlash kodi: ${code}. Kod 10 daqiqa amal qiladi.`,
  });
}
function diagnosisResult(category = "Konditsioner") {
  const results = {
    Konditsioner: {
      issue: "Drenaj tizimida tiqilish ehtimoli",
      confidence: 82,
      action: "Drenajni tozalash va filtrni tekshirish",
      price: "80 000–150 000 so‘m",
      time: "30–60 daqiqa",
      urgency: "Bugun",
      parts: ["Drenaj shlangi", "Universal filtr"],
    },
    Avtomobil: {
      issue: "Sovutish tizimi bosimi pasaygan",
      confidence: 76,
      action: "Radiator va suyuqlik darajasini tekshirish",
      price: "180 000–450 000 so‘m",
      time: "1–2 soat",
      urgency: "24 soat ichida",
      parts: ["Antifriz", "Xomut to‘plami"],
    },
    Kompyuter: {
      issue: "Sovutish tizimida chang to‘planishi",
      confidence: 89,
      action: "Tozalash va termopastani yangilash",
      price: "120 000–250 000 so‘m",
      time: "40–90 daqiqa",
      urgency: "Rejali",
      parts: ["Termopasta", "Siqilgan havo"],
    },
    Telefon: {
      issue: "Quvvat porti ifloslangan yoki bo‘shashgan",
      confidence: 72,
      action: "Portni diagnostika va tozalash",
      price: "70 000–220 000 so‘m",
      time: "30–60 daqiqa",
      urgency: "Rejali",
      parts: ["USB-C port", "Port moduli"],
    },
    Santexnika: {
      issue: "Ulanish joyida mikro sizib chiqish",
      confidence: 84,
      action: "Prokladka va ulanishni almashtirish",
      price: "60 000–180 000 so‘m",
      time: "30–90 daqiqa",
      urgency: "Bugun",
      parts: ["Prokladka", "FUM lenta"],
    },
    Elektr: {
      issue: "Kontakt qizishi yoki yuklama oshishi",
      confidence: 79,
      action: "Kabel va avtomatni tekshirish",
      price: "100 000–300 000 so‘m",
      time: "1–2 soat",
      urgency: "Zudlik bilan",
      parts: ["Klemma", "Avtomat himoya"],
    },
    "Uy jihozlari": {
      issue: "Quvvat va sensor ishlashida uzilish",
      confidence: 74,
      action: "Sensor va boshqaruv modulini tekshirish",
      price: "100 000–350 000 so‘m",
      time: "1–3 soat",
      urgency: "24 soat ichida",
      parts: ["Sensor", "Kabel to‘plami"],
    },
  };
  return results[category] || results.Konditsioner;
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      return socialRedirectLogin(req, res, "Google");
    const state = crypto.randomBytes(24).toString("hex");
    oauthStates.set(state, { expiresAt: Date.now() + 10 * 60 * 1000 });
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${appOrigin(req)}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    res.writeHead(302, {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": `usta_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
    });
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/api/auth/facebook")
    return socialRedirectLogin(req, res, "Facebook");
  if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const oauthState = state && oauthStates.get(state);
    const stateCookie = cookies(req).usta_oauth_state;
    oauthStates.delete(state);
    if (
      stateCookie !== state ||
      (oauthState && oauthState.expiresAt < Date.now())
    )
      return redirect(
        res,
        "/?auth_error=" + encodeURIComponent("Google login sessiyasi eskirgan"),
      );
    if (!code)
      return redirect(
        res,
        "/?auth_error=" + encodeURIComponent("Google login bekor qilindi"),
      );
    try {
      const redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `${appOrigin(req)}/api/auth/google/callback`;
      const tokens = await googleJson("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const profile = await googleJson(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      if (!profile.email || profile.email_verified === false)
        throw new Error("Google email tasdiqlanmagan");
      const user = data.users.find(
        (item) => item.email.toLowerCase() === profile.email.toLowerCase(),
      );
      if (!user)
        throw new Error("Avval email va parol bilan ro'yxatdan o'ting");
      const sessionToken = createSession(user);
      res.writeHead(302, {
        Location: "/?oauth=success",
        "Set-Cookie": [
          `usta_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
          "usta_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        ],
      });
      return res.end();
    } catch (error) {
      return redirect(res, "/?auth_error=" + encodeURIComponent(error.message));
    }
  }
  if (req.method === "POST" && url.pathname === "/api/auth/request-code") {
    const body = await parseBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email)
      return send(res, 400, { error: "Email manzilingizni kiriting" });
    const user = data.users.find((item) => item.email.toLowerCase() === email);
    if (!user) return send(res, 404, { error: "Bu email ro‘yxatdan o‘tmagan" });
    const code = String(crypto.randomInt(100000, 1000000));
    otpChallenges.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      otpChallenges.delete(email);
      return send(res, 503, { error: error.message });
    }
    return send(res, 200, { ok: true, message: "Tasdiqlash kodi yuborildi" });
  }
  if (req.method === "POST" && url.pathname === "/api/auth/verify-code") {
    const body = await parseBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const challenge = otpChallenges.get(email);
    if (!challenge || challenge.expiresAt < Date.now())
      return send(res, 401, { error: "Kod eskirgan. Yangi kod so‘rang" });
    if (String(body.code || "") !== challenge.code)
      return send(res, 401, { error: "Kod xato" });
    otpChallenges.delete(email);
    const user = data.users.find((item) => item.email.toLowerCase() === email);
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    saveData(data);
    return send(
      res,
      200,
      { user: publicUser(user), sessionToken: token },
      {
        "Set-Cookie": `usta_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    );
  }
  if (req.method === "POST" && url.pathname === "/api/auth/oauth") {
    const body = await parseBody(req);
    if (!body.provider || !body.email)
      return send(res, 400, { error: "Email manzilingizni kiriting" });
    let user = data.users.find((item) => item.email === body.email);
    if (!user)
      return send(res, 404, {
        error: "Avval email va parol bilan ro'yxatdan o'ting",
      });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    saveData(data);
    return send(
      res,
      200,
      { user: publicUser(user), provider: body.provider, sessionToken: token },
      {
        "Set-Cookie": `usta_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    );
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const user = data.users.find(
      (item) =>
        item.email.toLowerCase() === email && item.password === body.password,
    );
    if (!user) return send(res, 401, { error: "Email yoki parol noto‘g‘ri" });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    saveData(data);
    return send(
      res,
      200,
      { user: publicUser(user), sessionToken: token },
      {
        "Set-Cookie": `usta_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    );
  }
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await parseBody(req);
    const isSpecialist = body.role === "specialist";
    if (
      !body.name ||
      !body.email ||
      !body.password ||
      (isSpecialist && !String(body.phone || "").trim())
    )
      return send(res, 400, { error: "Barcha maydonlarni to‘ldiring" });
    if (data.users.some((user) => user.email === body.email))
      return send(res, 409, { error: "Bu email avval ro‘yxatdan o‘tgan" });
    const user = {
      id: `usr-${Date.now()}`,
      name: body.name,
      email: body.email,
      password: body.password,
      role: isSpecialist ? "specialist" : "user",
      specialty: body.specialty || "",
      phone: String(body.phone || "").trim(),
      rating: 5,
      jobs: 0,
      distance: "Yangi usta",
      available: true,
      accent: body.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    data.users.push(user);
    saveData(data);
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user.id);
    saveData(data);
    if (user.role === "specialist") {
      data.specialists.push({
        id: `usta-${user.id}`,
        name: user.name,
        specialty: user.specialty,
        phone: user.phone,
        rating: 5,
        jobs: 0,
        distance: "Yangi usta",
        available: true,
        accent: user.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      });
      saveData(data);
    }
    return send(
      res,
      201,
      { user: publicUser(user), sessionToken: token },
      {
        "Set-Cookie": `usta_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    );
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = cookies(req).usta_session;
    if (token) {
      sessions.delete(token);
      delete data.sessions?.[token];
      saveData(data);
    }
    return send(
      res,
      200,
      { ok: true },
      { "Set-Cookie": "usta_session=; HttpOnly; Path=/; Max-Age=0" },
    );
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me")
    return send(res, 200, {
      user: currentUser(req) ? publicUser(currentUser(req)) : null,
    });
  if (req.method === "GET" && url.pathname === "/api/specialists")
    return send(res, 200, { specialists: data.specialists });
  if (req.method === "GET" && url.pathname === "/api/parts")
    return send(res, 200, { parts: data.parts });
  if (req.method === "POST" && url.pathname === "/api/orders") {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const part = data.parts.find((item) => item.id === body.partId);
    const quantity = Math.max(1, Number(body.quantity) || 1);
    if (!part) return send(res, 404, { error: "Ehtiyot qism topilmadi" });
    if (part.stock < quantity)
      return send(res, 409, { error: "Omborda yetarli qism yo‘q" });
    part.stock -= quantity;
    const order = {
      id: `order-${Date.now()}`,
      userId: user.id,
      partId: part.id,
      quantity,
      total: part.price * quantity,
      status: "yangi",
      createdAt: new Date().toISOString(),
    };
    data.orders.unshift(order);
    saveData(data);
    return send(res, 201, { order });
  }
  if (req.method === "POST" && url.pathname === "/api/specialists") {
    const user = requireAuth(req, res);
    if (!user || !["specialist", "admin"].includes(user.role)) return;
    const body = await parseBody(req);
    const specialist = {
      id: `usta-${Date.now()}`,
      name: body.name || user.name,
      specialty: body.specialty || "Umumiy ta'mirlash",
      rating: 5,
      jobs: 0,
      distance: body.distance || "Yangi usta",
      available: true,
      accent: (body.name || user.name)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    data.specialists.push(specialist);
    saveData(data);
    return send(res, 201, { specialist });
  }
  if (req.method === "POST" && url.pathname === "/api/chat") {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const text = String(body.message || "").toLowerCase();
    let answer =
      "Muammoingizni yaxshiroq tushunish uchun rasm yoki qisqa video yuboring. Men sabab, shoshilinchlik va taxminiy narxni aniqlashga yordam beraman.";
    if (text.includes("suv") || text.includes("oq"))
      answer =
        "Suv oqishi ko‘pincha drenaj tiqilishi yoki shlang bukilishidan bo‘ladi. Qurilmani o‘chiring, polni quriting va diagnostika uchun rasm yuboring. Taxminiy xizmat narxi 80 000–150 000 so‘m.";
    if (text.includes("narx") || text.includes("qancha"))
      answer =
        "Aniq narx rasm va hududga bog‘liq. Oddiy diagnostika 50 000–100 000 so‘m, ta’mirlash esa ehtiyot qismiga qarab 80 000–450 000 so‘m oralig‘ida bo‘ladi.";
    if (text.includes("usta") || text.includes("chaqir"))
      answer =
        "Yaqin ustalarni topish uchun chap menyudagi Ustalar bo‘limiga o‘ting. U yerda reytingi, masofasi va mavjudligi ko‘rsatilgan.";
    return send(res, 200, { answer, createdAt: new Date().toISOString() });
  }
  if (req.method === "POST" && url.pathname === "/api/diagnoses") {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const result = diagnosisResult(body.category);
    const diagnosis = {
      id: `diag-${Date.now()}`,
      userId: user.id,
      category: body.category || "Konditsioner",
      note: body.note || "",
      result,
      createdAt: new Date().toISOString(),
    };
    data.diagnoses.unshift(diagnosis);
    saveData(data);
    return send(res, 201, { diagnosis });
  }
  if (req.method === "GET" && url.pathname === "/api/diagnoses") {
    const user = requireAuth(req, res);
    if (!user) return;
    return send(res, 200, {
      diagnoses:
        user.role === "admin"
          ? data.diagnoses
          : data.diagnoses.filter((item) => item.userId === user.id),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/admin/stats") {
    const user = requireAuth(req, res, "admin");
    if (!user) return;
    return send(res, 200, {
      stats: {
        users: data.users.length,
        diagnoses: data.diagnoses.length,
        specialists: data.specialists.length,
        urgent: data.diagnoses.filter(
          (item) => item.result.urgency === "Zudlik bilan",
        ).length,
      },
      recent: data.diagnoses.slice(0, 6),
      users: data.users.map(publicUser),
    });
  }
  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/users/")) {
    const admin = requireAuth(req, res, "admin");
    if (!admin) return;
    const userId = decodeURIComponent(
      url.pathname.slice("/api/admin/users/".length),
    );
    if (userId === admin.id)
      return send(res, 400, { error: "O'zingizni o'chira olmaysiz" });
    const index = data.users.findIndex((user) => user.id === userId);
    if (index === -1)
      return send(res, 404, { error: "Foydalanuvchi topilmadi" });
    const [removed] = data.users.splice(index, 1);
    for (const [token, sessionUserId] of sessions.entries()) {
      if (sessionUserId === userId) sessions.delete(token);
    }
    data.diagnoses = data.diagnoses.filter((item) => item.userId !== userId);
    if (removed.role === "specialist")
      data.specialists = data.specialists.filter(
        (item) => item.id !== `usta-${userId}`,
      );
    saveData(data);
    return send(res, 200, { ok: true, user: publicUser(removed) });
  }
  send(res, 404, { error: "API topilmadi" });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(PUBLIC, requested));
    if (!filePath.startsWith(PUBLIC))
      return send(res, 403, { error: "Ruxsat yo‘q" });
    const extension = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".svg": "image/svg+xml",
    };
    fs.readFile(filePath, (error, content) => {
      if (error) return send(res, 404, { error: "Sahifa topilmadi" });
      res.writeHead(200, {
        "Content-Type": `${types[extension] || "application/octet-stream"}; charset=utf-8`,
      });
      res.end(content);
    });
  } catch (error) {
    send(res, 500, { error: "Server xatosi" });
  }
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => console.log(`UstaAI http://localhost:${PORT}`));
}

module.exports = handleRequest;

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Eye, EyeOff, ShieldUser } from "@lucide/vue";
import { useAuthStore } from "@/stores/auth";
const email = ref(""),
  password = ref(""),
  show = ref(false),
  auth = useAuthStore(),
  router = useRouter(),
  route = useRoute();
async function submit() {
  try {
    await auth.login(email.value, password.value);
    await router.replace(
      typeof route.query.redirect === "string"
        ? route.query.redirect
        : "/dashboard",
    );
  } catch {
    /* store exposes error */
  }
}
</script>
<template>
  <main class="login">
    <section class="login-panel">
      <img
        class="login-watermark"
        src="/branding/ddr001-watermark.png"
        alt=""
        aria-hidden="true"
      />
      <div class="login-brand">
        <img src="/branding/aquafim-icon.png" alt="" width="42" height="42" />
        <span
          ><strong>Aquafim | Conagua Aguascalientes</strong
          ><small>Hidrantes parcelarios DDR001</small></span
        >
      </div>
      <div class="copy">
        <div class="institutional-logos">
          <img src="/branding/Aquafim-logo.png" alt="Aquafim" />
          <span class="logo-divider" aria-hidden="true"></span>
          <img src="/branding/conagua-logo.png" alt="CONAGUA" />
        </div>
        <p>PLATAFORMA ADMINISTRATIVA</p>
      </div>
    </section>
    <section class="form-panel">
      <form class="login-card card" @submit.prevent="submit">
        <div class="lock"><ShieldUser :size="28" aria-hidden="true" /></div>
        <h2>Iniciar sesión</h2>
        <p>Acceso exclusivo para personal autorizado</p>
        <div class="field">
          <label for="email">Correo electrónico</label
          ><input
            id="email"
            v-model.trim="email"
            type="email"
            autocomplete="username"
            required
            placeholder="admin@ddr001.mx"
          />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <div class="password">
            <input
              id="password"
              v-model="password"
              :type="show ? 'text' : 'password'"
              autocomplete="current-password"
              required
            /><button
              type="button"
              :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="show = !show"
            >
              <EyeOff v-if="show" :size="18" /><Eye v-else :size="18" />
            </button>
          </div>
        </div>
        <p v-if="auth.error" class="login-error" role="alert">
          {{ auth.error }}
        </p>
        <button class="btn btn--primary" :disabled="auth.loading">
          {{ auth.loading ? "Ingresando…" : "Ingresar" }}
        </button>
      </form>
    </section>
  </main>
</template>
<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  background: white;
}
.login-panel {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(145deg, #0e2139, #132f50);
  color: white;
  padding: 32px clamp(24px, 3.3vw, 60px);
  display: flex;
  flex-direction: column;
}
.login-brand {
  display: flex;
  gap: 12px;
  align-items: center;
}
.login-brand > img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  flex-shrink: 0;
}
.login-brand span {
  display: grid;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.login-brand small {
  color: #8daac8;
}
.copy {
  margin: auto 0;
  padding: 48px 0;
}
.institutional-logos {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) 1px minmax(0, 1fr);
  align-items: center;
  gap: clamp(12px, 1.5vw, 28px);
  padding: clamp(16px, 2vw, 28px);
  border-radius: 8px;
}
.institutional-logos img {
  display: block;
  width: 100%;
  height: auto;
}
.logo-divider {
  align-self: stretch;
  background: #c4ceda;
}
.login-watermark {
  position: absolute;
  z-index: -1;
  width: 90%;
  height: auto;
  right: -18%;
  bottom: -12%;
  opacity: 0.055;
  pointer-events: none;
}
.copy p {
  margin: 32px 0 0;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  color: #6fa5e5;
}
.form-panel {
  display: grid;
  place-items: center;
  padding: 28px;
  background: #f6f8fb;
}
.login-card {
  width: min(430px, 100%);
  padding: 40px;
  display: grid;
  gap: 19px;
  box-shadow: 0 18px 55px #1e334a15;
}
.lock {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #e9f1ff;
  color: #1260ed;
}
.login-card h2 {
  margin: 0;
  font-size: 1.55rem;
}
.login-card > p {
  margin: -12px 0 5px;
  color: var(--muted);
}
.password {
  position: relative;
}
.password input {
  padding-right: 44px;
}
.password button {
  position: absolute;
  right: 5px;
  top: 4px;
  height: 34px;
  width: 36px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #667891;
}
.login-error {
  color: #b32626 !important;
  background: #fff0f0;
  padding: 10px;
  border-radius: 6px;
  margin: 0 !important;
  font-size: 0.84rem;
}
@media (max-width: 800px) {
  .login {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .login-panel {
    padding: 22px;
  }
  .copy {
    margin: 24px 0 0;
    padding: 0;
    max-width: 440px;
  }
  .copy p {
    margin-top: 18px;
    font-size: 0.65rem;
  }
  .login-brand strong {
    font-size: 0.9rem;
  }
  .login-watermark {
    width: 55%;
    right: -8%;
    bottom: -45%;
  }
  .form-panel {
    padding: 18px;
  }
  .login-card {
    padding: 26px;
  }
}
</style>

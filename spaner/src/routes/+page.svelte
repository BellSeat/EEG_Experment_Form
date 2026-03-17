<script lang="ts">
  const navItems = ["Home", "About us", "Blog"];

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
  }
</script>

<svelte:head>
  <title>SPANER Lab Portal</title>
</svelte:head>

<div class="page-shell">
  <main class="portal-card">
    <section class="auth-panel">
      <div class="brand">SPANER Lab</div>

      <div class="auth-copy">
        <h1>SPANER Lab Portal</h1>
        <p>Secure access for research tools, reports, and team resources.</p>
      </div>

      <form class="login-form" onsubmit={handleSubmit}>
        <label class="field-group" for="email">
          <span class="field-label">Email section</span>
          <input
            id="email"
            name="email"
            type="text"
            placeholder="Email Address / User Name"
            value="huskey@uw.com"
          />
        </label>

        <label class="field-group" for="password">
          <span class="field-label field-label-hidden">Password</span>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value="passwordpassword"
          />
        </label>

        <div class="form-row">
          <label class="checkbox-row" for="remember">
            <input id="remember" type="checkbox" />
            <span>Remember Me</span>
          </label>

          <a href="/" class="muted-link">Forgot Password?</a>
        </div>

        <div class="actions">
          <button type="submit" class="button-primary">Login</button>
          <button type="button" class="button-secondary">Sign Up</button>
        </div>

        <div class="alt-login">
          <span>Or login with</span>
          <a href="/">UW NetID</a>
        </div>
      </form>
    </section>

    <section class="visual-panel">
      <nav class="top-nav" aria-label="Main navigation">
        {#each navItems as item, index}
          <a href="/" class:active={index === 0}>{item}</a>
        {/each}
      </nav>

      <div class="illustration" aria-hidden="true">
        <div class="circle circle-large"></div>
        <div class="circle circle-small"></div>
        <div class="placeholder-card"></div>
        <div class="placeholder-lines">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family:
      "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    background:
      linear-gradient(180deg, #d9d7d4 0%, #d8d7d3 100%);
    color: #4f4a45;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .page-shell {
    min-height: 100vh;
    padding: clamp(0.75rem, 2vw, 1rem);
    display: grid;
    place-items: center;
  }

  .portal-card {
    width: min(100%, 1024px);
    display: grid;
    grid-template-columns: minmax(320px, 1fr) minmax(360px, 1.18fr);
    background: #f8f7f4;
    overflow: hidden;
    box-shadow: 0 18px 48px rgba(123, 116, 105, 0.08);
  }

  .auth-panel {
    display: flex;
    flex-direction: column;
    padding: clamp(2rem, 5vw, 5rem);
    background: rgba(255, 255, 255, 0.88);
  }

  .brand {
    font-size: clamp(1.8rem, 2vw, 2.2rem);
    font-weight: 700;
    color: #f0bc00;
    letter-spacing: -0.03em;
  }

  .auth-copy {
    margin-top: clamp(4rem, 10vh, 8rem);
    max-width: 28rem;
  }

  .auth-copy h1 {
    margin: 0;
    font-size: clamp(2.3rem, 3vw, 3.4rem);
    line-height: 1.05;
    color: #f0bc00;
    letter-spacing: -0.04em;
  }

  .auth-copy p {
    margin: 1rem 0 0;
    color: #8e867d;
    font-size: 1rem;
    line-height: 1.6;
  }

  .login-form {
    margin-top: clamp(3rem, 9vh, 8rem);
    max-width: 31rem;
  }

  .field-group {
    display: block;
  }

  .field-group + .field-group {
    margin-top: -1px;
  }

  .field-label {
    display: inline-block;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    color: #7b4cff;
  }

  .field-label::before {
    content: "* ";
    font-size: 0.85rem;
  }

  .field-label-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  input[type="text"],
  input[type="password"] {
    width: 100%;
    border: 1px solid #d6cec3;
    background: #fffdfa;
    padding: 1.15rem 1.4rem;
    font-size: 1rem;
    color: #655e56;
    outline: none;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  input[type="text"] {
    border-left: 3px solid #4f6cff;
  }

  input::placeholder {
    color: #8c8379;
  }

  input:focus {
    border-color: #c9b88d;
    box-shadow: 0 0 0 3px rgba(240, 188, 0, 0.12);
  }

  .form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.25rem;
    font-size: 0.98rem;
  }

  .checkbox-row {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    color: #4f4a45;
  }

  .checkbox-row input {
    width: 1rem;
    height: 1rem;
    accent-color: #f0bc00;
  }

  .muted-link,
  .alt-login a,
  .top-nav a {
    color: inherit;
    text-decoration: none;
  }

  .muted-link {
    color: #7f7770;
  }

  .actions {
    display: flex;
    gap: 1.5rem;
    margin-top: 3rem;
  }

  button {
    border: 0;
    cursor: pointer;
    font: inherit;
    min-width: 8.25rem;
    min-height: 3.35rem;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  button:hover {
    transform: translateY(-1px);
  }

  .button-primary {
    background: #f0bc00;
    color: #423520;
    box-shadow: 0 7px 14px rgba(175, 140, 18, 0.18);
  }

  .button-secondary {
    background: transparent;
    color: #6546c6;
    border: 1px solid #f0bc00;
  }

  .alt-login {
    display: flex;
    gap: 2.25rem;
    margin-top: 4.5rem;
    color: #6f6861;
    font-size: 1rem;
  }

  .alt-login a {
    color: #5a44a3;
    font-weight: 600;
  }

  .visual-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: clamp(2rem, 5vw, 4rem) clamp(2rem, 6vw, 5rem);
    background:
      linear-gradient(180deg, rgba(239, 238, 236, 0.96), rgba(243, 242, 240, 0.96));
  }

  .top-nav {
    display: flex;
    gap: clamp(2rem, 4vw, 3.25rem);
    align-self: center;
    flex-wrap: wrap;
  }

  .top-nav a {
    position: relative;
    padding-bottom: 0.65rem;
    font-size: clamp(1.15rem, 1.8vw, 1.65rem);
    color: #67605a;
  }

  .top-nav a.active::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 0.18rem;
    background: #b7a57a;
  }

  .illustration {
    position: relative;
    flex: 1;
    min-height: 28rem;
    display: grid;
    place-items: center;
    margin-top: 2rem;
  }

  .placeholder-card {
    width: min(26rem, 80%);
    aspect-ratio: 1 / 1;
    border: 2px dashed rgba(154, 163, 190, 0.55);
    border-radius: 2rem;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(228, 233, 243, 0.5));
    box-shadow:
      0 30px 60px rgba(160, 164, 180, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
  }

  .placeholder-card::before {
    content: "Illustration area";
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    color: #9f9a94;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .placeholder-lines {
    position: absolute;
    right: 12%;
    bottom: 18%;
    display: grid;
    gap: 0.85rem;
  }

  .placeholder-lines span {
    display: block;
    height: 0.8rem;
    border-radius: 999px;
    background: rgba(173, 180, 205, 0.45);
  }

  .placeholder-lines span:nth-child(1) {
    width: 8rem;
  }

  .placeholder-lines span:nth-child(2) {
    width: 10.5rem;
  }

  .placeholder-lines span:nth-child(3) {
    width: 6rem;
  }

  .circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(2px);
  }

  .circle-large {
    width: 14rem;
    height: 14rem;
    right: 18%;
    top: 20%;
    background: rgba(255, 214, 102, 0.18);
  }

  .circle-small {
    width: 8rem;
    height: 8rem;
    left: 18%;
    bottom: 18%;
    background: rgba(107, 140, 255, 0.14);
  }

  @media (max-width: 980px) {
    .portal-card {
      width: 100%;
      grid-template-columns: 1fr;
    }

    .visual-panel {
      min-height: 32rem;
    }

    .auth-copy {
      margin-top: 3rem;
    }

    .login-form {
      margin-top: 2.5rem;
    }
  }

  @media (max-width: 640px) {
    .page-shell {
      padding: 0;
    }

    .portal-card {
      min-height: 100vh;
    }

    .auth-panel,
    .visual-panel {
      padding: 1.5rem;
    }

    .form-row,
    .actions,
    .alt-login {
      flex-direction: column;
      align-items: flex-start;
    }

    button {
      width: 100%;
    }

    .top-nav {
      align-self: flex-start;
      gap: 1.5rem;
    }

    .illustration {
      min-height: 22rem;
    }
  }
</style>

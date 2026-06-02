"use client";

import { useEffect } from "react";

/**
 * HomeClient — ShadowSpark Technologies marketing homepage.
 *
 * Ported 1:1 from the static design at Downloads/shadowspark.html.
 * Markup is injected verbatim via dangerouslySetInnerHTML so the original
 * hand-authored HTML/CSS render exactly as designed; the inline <script>
 * behaviour (theme toggle, mobile nav, contact form, nav shrink) is replayed
 * in the effect below. Styling lives in ./home.css. All icons are inline SVG,
 * so the original Lucide CDN fallback was dropped (no data-lucide elements).
 */

const MARKUP = String.raw`
  <a href="#main" class="skip-link">Skip to main content</a>

  <!-- ═══════════════ NAVIGATION ═══════════════ -->
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <a href="#" class="nav-logo" aria-label="ShadowSpark Technologies home">
      <svg class="nav-logo-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="currentColor" style="color: var(--color-primary-dim);"/>
        <!-- S spark mark: geometric lightning bolt -->
        <path d="M20 6L10 19H17L16 30L26 17H19L20 6Z" fill="var(--color-primary)" stroke="none"/>
        <circle cx="10" cy="12" r="2" fill="var(--color-accent)" opacity="0.7"/>
        <circle cx="26" cy="24" r="1.5" fill="var(--color-accent)" opacity="0.5"/>
      </svg>
      <span class="nav-logo-text">ShadowSpark</span>
    </a>
    <ul class="nav-links" role="list">
      <li><a href="#services">Services</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#expertise">Expertise</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
    <div class="nav-actions">
      <button class="theme-toggle" data-theme-toggle aria-label="Switch to light mode" title="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <a href="#contact" class="btn-nav">Hire Me</a>
      <button class="nav-hamburger" aria-label="Open navigation menu" id="menuBtn" aria-expanded="false">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  </nav>

  <!-- Mobile Nav -->
  <nav class="mobile-nav" id="mobileNav" aria-label="Mobile navigation">
    <a href="#services" onclick="closeMobileNav()">Services</a>
    <a href="#projects" onclick="closeMobileNav()">Projects</a>
    <a href="#about" onclick="closeMobileNav()">About</a>
    <a href="#expertise" onclick="closeMobileNav()">Expertise</a>
    <a href="#contact" onclick="closeMobileNav()">Contact</a>
  </nav>

  <main id="main">

  <!-- ═══════════════ HERO ═══════════════ -->
  <section class="hero" aria-label="Introduction">
    <div class="hero-bg">
      <img src="/hero/hero-bg.png"
           alt="Dark neural network tech visualization" width="1920" height="1080" />
    </div>
    <div class="hero-grid-overlay" aria-hidden="true"></div>
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span class="dot" aria-hidden="true"></span>
        Available for new projects · Owerri, Imo State, Nigeria
      </div>
      <h1 class="hero-title display">
        Building the<br/>
        <span class="line-accent">Infrastructure</span><br/>
        of Tomorrow.
      </h1>
      <p class="hero-desc">
        I'm Stephen Okoronkwo — Founder of ShadowSpark Technologies, building AI-powered
        WhatsApp chatbots, fintech platforms, and cloud-native infrastructure for Nigerian
        businesses and beyond.
      </p>
      <div class="hero-actions">
        <a href="#projects" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 3l14 9-14 9V3z"/></svg>
          View My Work
        </a>
        <a href="#contact" class="btn-outline">
          Let's Build Together
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
      <div class="hero-stats" role="list" aria-label="Key statistics">
        <div class="stat-item" role="listitem">
          <div class="stat-number display">5<span>+</span></div>
          <div class="stat-label">Years Building</div>
        </div>
        <div class="stat-item" role="listitem">
          <div class="stat-number display">15<span>+</span></div>
          <div class="stat-label">Production Systems</div>
        </div>
        <div class="stat-item" role="listitem">
          <div class="stat-number display">3</div>
          <div class="stat-label">Startups Founded</div>
        </div>
        <div class="stat-item" role="listitem">
          <div class="stat-number display">∞</div>
          <div class="stat-label">Lines of Code</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ TECH STRIP ═══════════════ -->
  <div class="tech-strip" aria-hidden="true">
    <div class="marquee-track">
      <!-- duplicate for seamless loop -->
      <span class="tech-tag"><span class="dot"></span>Next.js 15</span>
      <span class="tech-tag"><span class="dot"></span>TypeScript</span>
      <span class="tech-tag"><span class="dot"></span>AWS Bedrock</span>
      <span class="tech-tag"><span class="dot"></span>Prisma ORM</span>
      <span class="tech-tag"><span class="dot"></span>Neon PostgreSQL</span>
      <span class="tech-tag"><span class="dot"></span>Docker</span>
      <span class="tech-tag"><span class="dot"></span>AWS App Runner</span>
      <span class="tech-tag"><span class="dot"></span>Claude AI</span>
      <span class="tech-tag"><span class="dot"></span>Paystack</span>
      <span class="tech-tag"><span class="dot"></span>NextAuth.js</span>
      <span class="tech-tag"><span class="dot"></span>Google Cloud</span>
      <span class="tech-tag"><span class="dot"></span>Vercel</span>
      <span class="tech-tag"><span class="dot"></span>Gemini CLI</span>
      <span class="tech-tag"><span class="dot"></span>Node.js</span>
      <span class="tech-tag"><span class="dot"></span>REST APIs</span>
      <span class="tech-tag"><span class="dot"></span>Microservices</span>
      <!-- duplicate for seamless loop -->
      <span class="tech-tag"><span class="dot"></span>Next.js 15</span>
      <span class="tech-tag"><span class="dot"></span>TypeScript</span>
      <span class="tech-tag"><span class="dot"></span>AWS Bedrock</span>
      <span class="tech-tag"><span class="dot"></span>Prisma ORM</span>
      <span class="tech-tag"><span class="dot"></span>Neon PostgreSQL</span>
      <span class="tech-tag"><span class="dot"></span>Docker</span>
      <span class="tech-tag"><span class="dot"></span>AWS App Runner</span>
      <span class="tech-tag"><span class="dot"></span>Claude AI</span>
      <span class="tech-tag"><span class="dot"></span>Paystack</span>
      <span class="tech-tag"><span class="dot"></span>NextAuth.js</span>
      <span class="tech-tag"><span class="dot"></span>Google Cloud</span>
      <span class="tech-tag"><span class="dot"></span>Vercel</span>
      <span class="tech-tag"><span class="dot"></span>Gemini CLI</span>
      <span class="tech-tag"><span class="dot"></span>Node.js</span>
      <span class="tech-tag"><span class="dot"></span>REST APIs</span>
      <span class="tech-tag"><span class="dot"></span>Microservices</span>
    </div>
  </div>

  <!-- ═══════════════ SERVICES ═══════════════ -->
  <section class="section services-bg" id="services" aria-labelledby="services-heading">
    <div class="container">
      <div class="section-header fade-in">
        <p class="section-eyebrow">// What I Build</p>
        <h2 class="section-title display" id="services-heading">Services &amp;<br/>Capabilities</h2>
        <p class="section-desc">From rapid prototypes to enterprise-grade architectures — I design, build, and deploy systems that are fast, secure, and built for scale.</p>
      </div>
      <div class="services-grid">
        <article class="service-card fade-in" aria-label="AI Agent Systems service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
          </div>
          <h3 class="service-title">AI Agent Systems</h3>
          <p class="service-desc">Autonomous multi-agent pipelines using Claude, Gemini, and custom LLM orchestration. From chatbots to fully agentic task runners with tool use, memory, and context management.</p>
          <div class="service-tags">
            <span class="tag">Claude API</span>
            <span class="tag">Gemini</span>
            <span class="tag">LangChain</span>
            <span class="tag">Vector DBs</span>
          </div>
        </article>
        <article class="service-card fade-in" aria-label="Cloud Architecture service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
          </div>
          <h3 class="service-title">Cloud Architecture</h3>
          <p class="service-desc">Production infrastructure on AWS (ECR, App Runner, Bedrock), GCP, and Vercel. Containerised microservices, CI/CD pipelines, and multi-cloud strategies that actually hold up under load.</p>
          <div class="service-tags">
            <span class="tag">AWS</span>
            <span class="tag">Docker</span>
            <span class="tag">App Runner</span>
            <span class="tag">GCP</span>
          </div>
        </article>
        <article class="service-card fade-in" aria-label="Fintech Engineering service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <h3 class="service-title">Fintech Engineering</h3>
          <p class="service-desc">Multi-tenant payment systems, wallet infrastructure, Paystack integration, fraud detection, and regulatory-compliant platforms for the Nigerian and African fintech market.</p>
          <div class="service-tags">
            <span class="tag">Paystack</span>
            <span class="tag">Stripe</span>
            <span class="tag">Webhooks</span>
            <span class="tag">KYC/AML</span>
          </div>
        </article>
        <article class="service-card fade-in" aria-label="Full-Stack Web Applications service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <h3 class="service-title">Full-Stack Web Apps</h3>
          <p class="service-desc">End-to-end product development with Next.js 15, TypeScript, Prisma ORM, and Neon PostgreSQL. Server components, RBAC auth systems, real-time features, and mobile-first UIs.</p>
          <div class="service-tags">
            <span class="tag">Next.js</span>
            <span class="tag">TypeScript</span>
            <span class="tag">Prisma</span>
            <span class="tag">PostgreSQL</span>
          </div>
        </article>
        <article class="service-card fade-in" aria-label="PropTech Platforms service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h3 class="service-title">PropTech Platforms</h3>
          <p class="service-desc">AI-powered rental and property platforms. Built Lodgist — an end-to-end listing, booking, and tenant management system — from the ground up with AI-driven search and matching.</p>
          <div class="service-tags">
            <span class="tag">AI Search</span>
            <span class="tag">Geo APIs</span>
            <span class="tag">Booking Flows</span>
            <span class="tag">Tenant CRM</span>
          </div>
        </article>
        <article class="service-card fade-in" aria-label="Security & Fraud Systems service">
          <div class="service-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 class="service-title">Security &amp; Fraud Systems</h3>
          <p class="service-desc">Trust systems, fraud detection pipelines, device fingerprinting, rate limiting, and security auditing. Building systems where trust isn't an afterthought — it's the architecture.</p>
          <div class="service-tags">
            <span class="tag">OWASP</span>
            <span class="tag">Rate Limiting</span>
            <span class="tag">Auth Security</span>
            <span class="tag">Monitoring</span>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- ═══════════════ PROJECTS ═══════════════ -->
  <section class="section" id="projects" aria-labelledby="projects-heading">
    <div class="container">
      <div class="section-header fade-in">
        <p class="section-eyebrow">// What I've Shipped</p>
        <h2 class="section-title display" id="projects-heading">Featured<br/>Projects</h2>
        <p class="section-desc">Production systems that are live, used, and battle-tested.</p>
      </div>
      <div class="projects-grid">
        <article class="project-card featured fade-in" aria-label="Lodgist project">
          <div class="project-header">
            <p class="project-label">PropTech · AI Platform · Founder</p>
            <h3 class="project-title display">Lodgist</h3>
            <p class="project-desc">An AI-powered rental platform for the Nigerian market. Landlords list properties; tenants discover, book, and manage rentals — end to end. Built with AI-driven search, geo-based matching, integrated Paystack payments, fraud detection, and a multi-tenant RBAC system. Designed from the ground up to solve Africa's informal rental market.</p>
          </div>
          <div class="project-body">
            <div class="project-stack">
              <span class="tag">Next.js 15</span>
              <span class="tag">TypeScript</span>
              <span class="tag">Prisma</span>
              <span class="tag">Neon PostgreSQL</span>
              <span class="tag">Paystack</span>
              <span class="tag">Vercel</span>
              <span class="tag">Google OAuth</span>
              <span class="tag">AI Search</span>
            </div>
            <div class="project-links">
              <span class="project-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Live Platform
              </span>
            </div>
          </div>
        </article>
        <article class="project-card fade-in" aria-label="ShadowSpark AI Infrastructure project">
          <div class="project-header">
            <p class="project-label">Cloud · AI · AWS</p>
            <h3 class="project-title display">ShadowSpark AI Infrastructure</h3>
            <p class="project-desc">Production multi-agent AI framework deployed on AWS. Containerised agents running on App Runner, orchestrated with AWS Bedrock, and wired to a WhatsApp chatbot pipeline for client delivery.</p>
          </div>
          <div class="project-body">
            <div class="project-stack">
              <span class="tag">AWS ECR</span>
              <span class="tag">App Runner</span>
              <span class="tag">Bedrock</span>
              <span class="tag">Docker</span>
              <span class="tag">WhatsApp API</span>
            </div>
          </div>
        </article>
        <article class="project-card fade-in" aria-label="RBAC Auth System project">
          <div class="project-header">
            <p class="project-label">Auth · Security · SaaS</p>
            <h3 class="project-title display">Multi-Tenant RBAC Auth</h3>
            <p class="project-desc">Enterprise-grade role-based access control system. Supports Google OAuth, email/password flows, organisation-scoped permissions, session management, and full audit logging.</p>
          </div>
          <div class="project-body">
            <div class="project-stack">
              <span class="tag">NextAuth.js</span>
              <span class="tag">Google OAuth</span>
              <span class="tag">Prisma</span>
              <span class="tag">JWT</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <!-- ═══════════════ ABOUT ═══════════════ -->
  <section class="section services-bg" id="about" aria-labelledby="about-heading">
    <div class="container">
      <div class="about-grid">
        <div class="about-visual fade-in">
          <img src="/hero/about-visual.png"
               alt="Software architect working with cloud infrastructure and AI systems visualization"
               width="800" height="600" loading="lazy" />
          <div class="about-badge" aria-label="Currently available for projects">
            <div class="about-badge-dot" aria-hidden="true"></div>
            <span class="about-badge-text">Open to new projects</span>
          </div>
        </div>
        <div class="about-content fade-in">
          <p class="section-eyebrow">// Who I Am</p>
          <h2 class="about-title display" id="about-heading">Architect.<br/>Founder.<br/>Builder.</h2>
          <p class="about-desc">
            I'm Stephen Okoronkwo — a self-made software architect and serial founder based in Owerri, Imo State. A graduate of Federal Polytechnic Nekede (Government College Umuahia alumnus) who went from Public Administration to building AI-powered systems, cloud infrastructure, and fintech platforms that compete globally. I founded ShadowSpark Technologies as my vehicle to ship world-class engineering across AI, fintech, and PropTech.
          </p>
          <p class="about-desc">
            I work across the entire stack — from AWS infrastructure and Docker containers to Next.js frontends and Prisma-backed APIs. My edge is at the intersection of AI and production systems: autonomous agents, intelligent pipelines, and platforms that solve real African market problems.
          </p>
          <div class="service-tags" aria-label="Affiliations">
            <span class="tag">Google Developer</span>
            <span class="tag">Founder, ShadowSpark Technologies</span>
          </div>
          <div class="about-skills" aria-label="Technical proficiency">
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">Cloud &amp; DevOps</span>
                <span class="skill-pct">95%</span>
              </div>
              <div class="skill-bar"><div class="skill-fill" style="width:95%"></div></div>
            </div>
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">AI / LLM Engineering</span>
                <span class="skill-pct">90%</span>
              </div>
              <div class="skill-bar"><div class="skill-fill" style="width:90%"></div></div>
            </div>
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">Fintech &amp; Payments</span>
                <span class="skill-pct">88%</span>
              </div>
              <div class="skill-bar"><div class="skill-fill" style="width:88%"></div></div>
            </div>
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">Full-Stack (Next.js / TS)</span>
                <span class="skill-pct">95%</span>
              </div>
              <div class="skill-bar"><div class="skill-fill" style="width:95%"></div></div>
            </div>
            <div class="skill-row">
              <div class="skill-header">
                <span class="skill-name">Security Architecture</span>
                <span class="skill-pct">82%</span>
              </div>
              <div class="skill-bar"><div class="skill-fill" style="width:82%"></div></div>
            </div>
          </div>
          <a href="#contact" class="btn-primary" style="align-self: flex-start; display: inline-flex;">
            Start a Conversation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ EXPERTISE BENTO ═══════════════ -->
  <section class="section" id="expertise" aria-labelledby="expertise-heading">
    <div class="container">
      <div class="section-header fade-in">
        <p class="section-eyebrow">// Technical Depth</p>
        <h2 class="section-title display" id="expertise-heading">Deep Expertise<br/>&amp; Core Stack</h2>
      </div>
      <div class="bento-grid" role="list" aria-label="Technical expertise areas">
        <!-- Large: Code snippet card -->
        <div class="bento-card col-8 bento-accent-bg fade-in" role="listitem" aria-label="Architecture code sample">
          <p class="section-eyebrow">// Production Pattern</p>
          <h3 class="bento-title display">Architecture-First Engineering</h3>
          <p style="font-size:var(--text-sm); color:var(--color-text-muted); max-width:50ch; line-height:1.7;">
            Every system I build starts with data flow design and security boundaries — not just "make it work." Fault-tolerant, observable, and deployable with a single command.
          </p>
          <div class="bento-code" aria-label="Example Docker deployment code">
<span class="cm"># Deploy to AWS App Runner</span>
<span class="kw">docker</span> build -t shadowspark-api .
<span class="kw">aws</span> ecr get-login-password | <span class="fn">docker</span> login --username AWS <span class="str">$ECR_URL</span>
<span class="kw">docker</span> push <span class="str">$ECR_URL</span>/shadowspark-api:latest
<span class="fn">copilot</span> svc deploy --name api --env production
          </div>
        </div>

        <!-- Stat: Deployments -->
        <div class="bento-card col-4 fade-in" role="listitem" aria-label="Deployment statistics">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
          </div>
          <div class="bento-value" aria-label="50 plus deployments">50<span style="font-size:0.5em; color:var(--color-text-muted)">+</span></div>
          <div class="bento-label">Production Deployments</div>
        </div>

        <!-- LLM/AI card -->
        <div class="bento-card col-4 fade-in" role="listitem" aria-label="AI tools and models used">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
          </div>
          <h3 class="bento-title">AI/LLM Stack</h3>
          <ul class="bento-list" aria-label="AI tools">
            <li>Claude Code (Anthropic)</li>
            <li>Gemini CLI (Google)</li>
            <li>AWS Bedrock</li>
            <li>Autonomous Agents</li>
            <li>Custom RAG Pipelines</li>
          </ul>
        </div>

        <!-- Infra card -->
        <div class="bento-card col-4 fade-in" role="listitem" aria-label="Infrastructure stack">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h3 class="bento-title">Infra &amp; DevOps</h3>
          <ul class="bento-list" aria-label="Infrastructure tools">
            <li>AWS (ECR, App Runner, IAM)</li>
            <li>Docker + Copilot CLI</li>
            <li>Vercel Edge Network</li>
            <li>GitHub Actions CI/CD</li>
            <li>Neon Serverless Postgres</li>
          </ul>
        </div>

        <!-- Stat: Multi-cloud -->
        <div class="bento-card col-4 fade-in" role="listitem" aria-label="Cloud platforms count">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div class="bento-value" aria-label="3 cloud platforms">3</div>
          <div class="bento-label">Cloud Platforms Mastered</div>
        </div>

        <!-- Frontend card -->
        <div class="bento-card col-6 fade-in" role="listitem" aria-label="Frontend technologies">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <h3 class="bento-title">Frontend Excellence</h3>
          <p style="font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.6; margin-bottom: var(--space-4);">
            Next.js App Router, TypeScript, Tailwind CSS, React Server Components, and modern UX patterns. Pixel-perfect, accessible, and fast by default.
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:var(--space-2);">
            <span class="tag">Next.js 15</span>
            <span class="tag">React</span>
            <span class="tag">TypeScript</span>
            <span class="tag">Tailwind</span>
            <span class="tag">Radix UI</span>
          </div>
        </div>

        <!-- Backend card -->
        <div class="bento-card col-6 fade-in" role="listitem" aria-label="Backend technologies">
          <div class="bento-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <h3 class="bento-title">Backend &amp; Data</h3>
          <p style="font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.6; margin-bottom: var(--space-4);">
            Node.js APIs, Prisma ORM, PostgreSQL schemas, serverless functions, and event-driven architectures. From seed to production migration — zero data loss.
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:var(--space-2);">
            <span class="tag">Node.js</span>
            <span class="tag">Prisma</span>
            <span class="tag">PostgreSQL</span>
            <span class="tag">REST APIs</span>
            <span class="tag">Webhooks</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ PROCESS ═══════════════ -->
  <section class="section services-bg" id="process" aria-labelledby="process-heading">
    <div class="container-default">
      <div class="section-header fade-in">
        <p class="section-eyebrow">// How I Work</p>
        <h2 class="section-title display" id="process-heading">My Engineering<br/>Process</h2>
        <p class="section-desc">Structured. Transparent. Obsessed with quality at every layer.</p>
      </div>
      <div class="process-list fade-in" role="list">
        <div class="process-step" role="listitem">
          <div class="process-dot" aria-hidden="true"></div>
          <p class="process-num">01 / Discover</p>
          <h3 class="process-title">Deep Problem Analysis</h3>
          <p class="process-desc">Before writing a line of code, I map data flows, security boundaries, and user journeys. Requirements aren't a checkbox — they're the foundation of every architectural decision.</p>
        </div>
        <div class="process-step" role="listitem">
          <div class="process-dot" aria-hidden="true"></div>
          <p class="process-num">02 / Design</p>
          <h3 class="process-title">Architecture &amp; System Design</h3>
          <p class="process-desc">Schema design, API contracts, microservice boundaries, and cloud topology — all defined before the first commit. Prevents expensive refactors and keeps teams aligned.</p>
        </div>
        <div class="process-step" role="listitem">
          <div class="process-dot" aria-hidden="true"></div>
          <p class="process-num">03 / Build</p>
          <h3 class="process-title">Rapid, Tested Implementation</h3>
          <p class="process-desc">Fast iteration with AI-assisted development (Claude Code, Gemini CLI), containerised from day one, with CI/CD pipelines that make deployment feel like pressing a button.</p>
        </div>
        <div class="process-step" role="listitem">
          <div class="process-dot" aria-hidden="true"></div>
          <p class="process-num">04 / Deploy &amp; Harden</p>
          <h3 class="process-title">Production-Grade Delivery</h3>
          <p class="process-desc">Zero-downtime deployments, monitoring, rate limiting, fraud detection, and security hardening. I don't ship code — I ship systems that can be relied on.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ CONTACT ═══════════════ -->
  <section class="section contact-bg" id="contact" aria-labelledby="contact-heading">
    <div class="container">
      <div class="section-header fade-in">
        <p class="section-eyebrow">// Let's Build</p>
        <h2 class="section-title display" id="contact-heading">Start a Project<br/>or Conversation</h2>
        <p class="section-desc">Whether it's a startup idea, an enterprise system, or an AI integration — I'm ready to build it with you.</p>
      </div>
      <div class="contact-grid">
        <div class="fade-in">
          <a href="mailto:hello@shadowspark.tech" class="contact-item" target="_blank" rel="noopener noreferrer" aria-label="Email: hello@shadowspark.tech">
            <div class="contact-item-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div class="contact-item-info">
              <span class="contact-item-label">Email</span>
              <span class="contact-item-value">hello@shadowspark.tech</span>
            </div>
          </a>
          <a href="https://github.com/shadowspark-technologies" class="contact-item" target="_blank" rel="noopener noreferrer" aria-label="GitHub: shadowspark-technologies">
            <div class="contact-item-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            </div>
            <div class="contact-item-info">
              <span class="contact-item-label">GitHub</span>
              <span class="contact-item-value">shadowspark-technologies</span>
            </div>
          </a>
          <a href="https://linkedin.com/in/shadowspark" class="contact-item" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
            <div class="contact-item-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </div>
            <div class="contact-item-info">
              <span class="contact-item-label">LinkedIn</span>
              <span class="contact-item-value">Connect on LinkedIn</span>
            </div>
          </a>
          <div class="contact-item" style="cursor:default;" aria-label="Location: Owerri, Imo State, Nigeria">
            <div class="contact-item-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="contact-item-info">
              <span class="contact-item-label">Location</span>
              <span class="contact-item-value">Owerri, Imo State, Nigeria · Remote-friendly</span>
            </div>
          </div>
        </div>
        <form class="contact-form fade-in" aria-label="Contact form" onsubmit="handleFormSubmit(event)">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="name">Your Name</label>
              <input class="form-input" type="text" id="name" name="name" placeholder="John Doe" required autocomplete="name" />
            </div>
            <div class="form-group">
              <label class="form-label" for="email">Email Address</label>
              <input class="form-input" type="email" id="email" name="email" placeholder="john@company.com" required autocomplete="email" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="project-type">Project Type</label>
            <select class="form-input" id="project-type" name="project-type">
              <option value="">Select a service…</option>
              <option>AI Agent System</option>
              <option>Cloud Architecture</option>
              <option>Fintech Platform</option>
              <option>Full-Stack Web App</option>
              <option>PropTech Platform</option>
              <option>Security Audit</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="message">Tell Me About Your Project</label>
            <textarea class="form-textarea" id="message" name="message" placeholder="Describe what you're building, the tech challenges, timeline, and budget if relevant…" required></textarea>
          </div>
          <button type="submit" class="btn-submit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Send Message
          </button>
          <p id="form-feedback" style="font-size:var(--text-sm); color:var(--color-primary); display:none; margin-top:var(--space-2);" role="status" aria-live="polite">
            ✓ Message sent! I'll get back to you within 24 hours.
          </p>
        </form>
      </div>
    </div>
  </section>

  </main>

  <!-- ═══════════════ FOOTER ═══════════════ -->
  <footer class="footer" role="contentinfo">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="footer-brand-name display">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="var(--color-primary-dim)"/>
              <path d="M20 6L10 19H17L16 30L26 17H19L20 6Z" fill="var(--color-primary)"/>
              <circle cx="10" cy="12" r="2" fill="var(--color-accent)" opacity="0.7"/>
            </svg>
            ShadowSpark Technologies
          </div>
          <p class="footer-tagline">
            Building the technical infrastructure of Africa's digital future — one production system at a time.
          </p>
        </div>
        <nav class="footer-links-group" aria-label="Footer navigation">
          <div class="footer-col">
            <span class="footer-col-title">Navigation</span>
            <a href="#services">Services</a>
            <a href="#projects">Projects</a>
            <a href="#about">About</a>
            <a href="#expertise">Expertise</a>
            <a href="#contact">Contact</a>
          </div>
          <div class="footer-col">
            <span class="footer-col-title">Specialisms</span>
            <a href="#services">AI Systems</a>
            <a href="#services">Cloud / AWS</a>
            <a href="#services">Fintech</a>
            <a href="#services">Full-Stack</a>
            <a href="#services">Security</a>
          </div>
          <div class="footer-col">
            <span class="footer-col-title">Projects</span>
            <a href="#projects">Lodgist</a>
            <a href="#projects">AI Infrastructure</a>
            <a href="#projects">RBAC Auth</a>
          </div>
        </nav>
      </div>
      <div class="footer-bottom">
        <span class="footer-copy">© 2026 ShadowSpark Technologies. All rights reserved.</span>
        <div class="footer-socials" aria-label="Social links">
          <a href="https://github.com/shadowspark-technologies" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </a>
          <a href="https://linkedin.com/in/shadowspark" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          </a>
          <a href="mailto:hello@shadowspark.tech" class="social-link" aria-label="Email">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
`;

export default function HomeClient() {
  useEffect(() => {
    const root = document.documentElement;

    // ── Theme toggle ────────────────────────────────────────────
    const toggle = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
    let theme: "dark" | "light" = "dark";
    root.setAttribute("data-theme", theme);

    const sunIcon =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const moonIcon =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    const updateToggleIcon = (t: "dark" | "light") => {
      if (!toggle) return;
      toggle.setAttribute("aria-label", "Switch to " + (t === "dark" ? "light" : "dark") + " mode");
      toggle.innerHTML = t === "dark" ? sunIcon : moonIcon;
    };
    updateToggleIcon(theme);

    const onToggleClick = () => {
      theme = theme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", theme);
      updateToggleIcon(theme);
    };
    toggle?.addEventListener("click", onToggleClick);

    // ── Mobile nav ──────────────────────────────────────────────
    const menuBtn = document.getElementById("menuBtn");
    const mobileNav = document.getElementById("mobileNav");

    const hamburgerOpen =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const hamburgerClosed =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

    const onMenuClick = () => {
      if (!mobileNav || !menuBtn) return;
      const isOpen = mobileNav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      menuBtn.innerHTML = isOpen ? hamburgerOpen : hamburgerClosed;
    };
    menuBtn?.addEventListener("click", onMenuClick);

    const closeMobileNav = () => {
      mobileNav?.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
    };
    // Exposed for inline onclick="closeMobileNav()" handlers in the markup.
    (window as unknown as { closeMobileNav: () => void }).closeMobileNav = closeMobileNav;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        mobileNav &&
        mobileNav.classList.contains("open") &&
        !mobileNav.contains(target) &&
        menuBtn &&
        !menuBtn.contains(target)
      ) {
        closeMobileNav();
      }
    };
    document.addEventListener("click", onDocClick);

    // ── Contact form (demo submit) ──────────────────────────────
    const checkIcon =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Sent!';
    const sendIcon =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';

    const handleFormSubmit = (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const btn = form.querySelector<HTMLButtonElement>(".btn-submit");
      const feedback = document.getElementById("form-feedback");
      if (!btn || !feedback) return;
      btn.disabled = true;
      btn.innerHTML = checkIcon;
      btn.style.background = "var(--color-success)";
      feedback.style.display = "block";
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = sendIcon;
        btn.style.background = "";
      }, 5000);
    };
    // Exposed for inline onsubmit="handleFormSubmit(event)" in the markup.
    (window as unknown as { handleFormSubmit: (e: Event) => void }).handleFormSubmit = handleFormSubmit;

    // ── Nav shrink on scroll ────────────────────────────────────
    const nav = document.querySelector<HTMLElement>(".nav");
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 60) {
        nav.style.height = "60px";
        nav.style.borderBottomColor = "var(--color-border)";
      } else {
        nav.style.height = "72px";
        nav.style.borderBottomColor = "";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      toggle?.removeEventListener("click", onToggleClick);
      menuBtn?.removeEventListener("click", onMenuClick);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}

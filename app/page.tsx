import Link from "next/link";
import { ArrowDown, ArrowRight, Check, CheckCheck, Inbox, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { BotanicalArt } from "@/components/landing/BotanicalArt";
import { Reveal } from "@/components/landing/Reveal";

const steps = [
  { number: "01", title: "Set up your domain", text: "Connect the business domain your team already uses, then choose who manages its mail." },
  { number: "02", title: "Approve each address", text: "Employees request a company address. An admin reviews it before mailbox access is granted." },
  { number: "03", title: "Work from one inbox", text: "Approved people see mail sent to their address, with conversations grouped into familiar threads." },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="landing-nav">
          <Link href="/" className="landing-brand" aria-label="Mailico home"><span className="brand-mark"><Mail size={16} strokeWidth={1.7} /></span>mailico</Link>
          <nav className="landing-menu flex items-center gap-8" aria-label="Main navigation">
            <Link href="#product">Product</Link><Link href="#how-it-works">How it works</Link><Link href="/pricing">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3"><Link className="nav-signin" href="/login">Sign in</Link><Link className="button button-dark nav-cta" href="/register">Get started <ArrowRight size={14} /></Link></div>
        </header>

        <section className="landing-hero">
          <BotanicalArt className="hero-botanical" />
          <Reveal className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Company email, considered</span>
            <h1>Good email.<br /><em>Better organized.</em></h1>
            <p>Bring your business domain, your team, and every important conversation into one calm, well-managed place.</p>
            <div className="hero-actions"><Link className="button button-dark" href="/register">Create your workspace <ArrowRight size={15} /></Link><Link className="button button-outline" href="/manual">Explore the guide <ArrowDown size={14} /></Link></div>
            <div className="hero-note"><ShieldCheck size={15} /> Access is approved by your company admin</div>
          </Reveal>

          <div className="hero-scene" aria-label="Illustration of Mailico's business inbox">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <div className="floating-note note-request"><span className="request-icon"><UsersRound size={15} /></span><span><b>Address request</b><small>samira@northfield.co</small></span><span className="request-status">Review</span></div>
            <div className="mail-window">
              <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>INBOX <b>northfield.co</b></span><span className="window-avatar">S</span></div>
              <div className="inbox-layout"><aside><div className="side-pill"><Inbox size={14}/> Inbox <b>4</b></div><div className="side-line"/><div className="side-line short"/><div className="side-line"/><div className="side-line tiny"/></aside>
                <div className="message-list"><div className="inbox-label">TODAY <span>•••</span></div>
                  <div className="mail-row selected"><div className="mail-avatar green">N</div><div className="mail-text"><b>Northfield Studio</b><span>Updated project notes</span><small>Here are the latest notes from our call…</small></div><time>10:42</time></div>
                  <div className="mail-row"><div className="mail-avatar blush">M</div><div className="mail-text"><b>Mina Rahman</b><span>Re: Tuesday schedule</span><small>Sounds good, I’ve added it to the calendar.</small></div><time>09:18</time></div>
                  <div className="mail-row"><div className="mail-avatar sand">A</div><div className="mail-text"><b>Accounts team</b><span>Invoice 1048 is ready</span><small>Please find the document attached…</small></div><time>Yesterday</time></div>
                </div>
              </div>
              <div className="window-footer"><span><span className="online-dot"/> Connected to your company domain</span><span>3 conversations</span></div>
            </div>
            <div className="floating-note note-approved"><span className="approved-icon"><Check size={14} /></span><span><b>Request approved</b><small>Mailbox access is ready</small></span></div>
            <div className="hero-caption">A clearer way to manage company mail <span>✳</span></div>
          </div>
        </section>

        <div className="trust-band"><span>MADE FOR THE WAY SMALL TEAMS WORK</span><div><b>One company</b><i>·</i><b>Your domain</b><i>·</i><b>Managed access</b><i>·</i><b>Every conversation</b></div></div>

        <section className="story-section" id="product">
          <Reveal className="story-heading"><span className="eyebrow">THE PEOPLE BEHIND THE ADDRESS</span><h2>Know who belongs<br />in the conversation.</h2><p>Mailico gives your team a dependable company inbox, with a clear approval step between an address request and access.</p><Link className="text-link" href="/register">Set up your team <ArrowRight size={15}/></Link></Reveal>
          <Reveal className="request-card" delay={100}><div className="card-kicker"><span>TEAM ACCESS</span><span className="muted-chip">Pending review</span></div><div className="request-person"><div className="portrait">SR</div><div><b>Samira Rahman</b><small>Operations · New address request</small></div><span className="more">•••</span></div><div className="requested-address"><small>REQUESTED COMPANY EMAIL</small><b>samira@northfield.co</b></div><p className="request-message">“I need a company address to reply to partner and client messages.”</p><div className="request-actions"><button type="button" className="approve-button"><Check size={14}/> Approve request</button><span>Only an admin can grant access</span></div></Reveal>
          <BotanicalArt className="story-botanical" />
          <div className="story-aside"><span className="aside-rule"/><p>Every person gets access to <b>their own approved address</b> and the mail sent to it.</p></div>
        </section>

        <section className="feature-grid">
          <Reveal className="feature-card feature-blush"><div className="feature-visual petals" aria-hidden="true"><span/><span/><span/><span/></div><span className="feature-tag">01 / DOMAIN</span><h3>Your domain,<br />your identity.</h3><p>Bring a custom business domain and create addresses that feel like part of your company.</p><Link href="/pricing" className="text-link">See what’s included <ArrowRight size={14}/></Link></Reveal>
          <Reveal className="feature-card feature-paper" delay={100}><div className="feature-visual thread-visual"><div><b>Re: Launch timeline</b><span>4 messages · 2 participants</span><hr/><small>Thanks for sending this through. We’re aligned on the dates…</small><hr/><small>Great, I’ll share the updated schedule with the team.</small></div><span className="thread-count">4</span></div><span className="feature-tag">02 / CONVERSATIONS</span><h3>Messages stay<br />in their thread.</h3><p>Follow the full conversation together, with replies kept in a familiar, readable thread.</p><Link href="/manual" className="text-link">See the inbox guide <ArrowRight size={14}/></Link></Reveal>
          <Reveal className="feature-card feature-sage" delay={180}><div className="feature-visual access-visual"><div className="access-row"><span className="mini-avatar">A</span><span>Admin review</span><CheckCheck size={15}/></div><div className="access-row"><span className="mini-avatar alt">T</span><span>Address approved</span><Check size={15}/></div><div className="access-lock"><ShieldCheck size={17}/><span>Approved address only</span></div></div><span className="feature-tag">03 / ACCESS</span><h3>Simple rules.<br />Clear access.</h3><p>Admins review requests and manage addresses, so access stays intentional as your team grows.</p><Link href="/register" className="text-link">Create your workspace <ArrowRight size={14}/></Link></Reveal>
        </section>

        <section className="dark-feature">
          <BotanicalArt className="dark-botanical" />
          <Reveal className="dark-copy"><span className="eyebrow eyebrow-light">A WORKSPACE THAT FEELS LIKE YOURS</span><h2>All your work mail.<br /><em>In its right place.</em></h2><p>Mailico connects your team to company-domain email through one focused workspace. See your messages, reply in context, and keep every conversation moving.</p><Link className="button button-light" href="/register">Make it yours <ArrowRight size={15}/></Link></Reveal>
          <Reveal className="thread-window" delay={150}><div className="thread-head"><span>←</span><span>INBOX <b>› Launch planning</b></span><span>☆</span></div><div className="thread-subject"><b>Launch planning</b><span>4 messages · Samira, Alex</span></div><div className="thread-message"><span className="thread-avatar">S</span><div><b>Samira Rahman <small>to Alex</small></b><time>10:42 AM</time><p>Sharing the latest schedule here. I’ve included the notes from our team review below.</p></div></div><div className="thread-message reply"><span className="thread-avatar avatar-alt">A</span><div><b>Alex Morgan <small>to Samira</small></b><time>11:06 AM</time><p>Looks good from our side. Thanks for pulling this together!</p></div></div><div className="reply-box">Reply to conversation… <span>↗</span></div></Reveal>
        </section>

        <section className="steps-section" id="how-it-works"><Reveal className="steps-heading"><div><span className="eyebrow">A FEW THOUGHTFUL STEPS</span><h2>Up and running,<br /><em>without the runaround.</em></h2></div><p>A straightforward setup for one company, one domain, and the people who need to use it.</p></Reveal><div className="steps-grid">{steps.map((step, index) => <Reveal key={step.number} className="step-card" delay={index * 100}><span className="step-number">{step.number}</span><div className="step-line"><i/></div><h3>{step.title}</h3><p>{step.text}</p></Reveal>)}</div></section>

        <section className="closing-cta"><Reveal><span className="eyebrow">A BETTER HOME FOR BUSINESS EMAIL</span><h2>Make room for<br /><em>good work.</em></h2><p>Set up your company workspace and give your team a clearer way to handle email.</p><Link href="/register" className="button button-dark">Get started with Mailico <ArrowRight size={15}/></Link></Reveal><BotanicalArt className="closing-botanical" /></section>

        <footer className="landing-footer"><Link href="/" className="landing-brand"><span className="brand-mark"><Mail size={15}/></span>mailico</Link><span>Thoughtful email for work.</span><div><Link href="/pricing">Plans</Link><Link href="/manual">Guide</Link><Link href="/login">Sign in</Link></div><small>© {new Date().getFullYear()} Mailico</small></footer>
      </div>
      <div className="marquee" aria-hidden="true"><div className="marquee-track"><span>Collect <i>✳</i> Read <i>✳</i> Reply <i>✳</i> Keep in touch <i>✳</i>&nbsp;</span><span>Collect <i>✳</i> Read <i>✳</i> Reply <i>✳</i> Keep in touch <i>✳</i>&nbsp;</span></div></div>
    </main>
  );
}

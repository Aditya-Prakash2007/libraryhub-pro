// Landing page - LibraryHub Pro
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  LayoutGrid,
  CreditCard,
  BarChart3,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle2,
  Clock,
  QrCode,
} from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "Smart Seat Management",
    description: "Visual seat map with real-time availability. Movie-ticket style selection UI.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Users,
    title: "Student Management",
    description: "Complete student profiles with documents, QR ID cards and attendance tracking.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: CreditCard,
    title: "Payment Collection",
    description: "Razorpay integration for online payments. Auto receipts & invoice generation.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: QrCode,
    title: "QR Attendance",
    description: "Students carry QR ID cards. Admin scans to mark attendance instantly.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Revenue forecasts, attendance analytics, shift occupancy and performance scores.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Multi-Tenant SaaS",
    description: "Each library owner gets isolated data. Role-based access control built-in.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

const stats = [
  { label: "Libraries Using", value: "2,400+" },
  { label: "Students Managed", value: "180K+" },
  { label: "Payments Processed", value: "₹12Cr+" },
  { label: "Uptime", value: "99.9%" },
];

const plans = [
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    description: "Perfect for small libraries",
    features: [
      "Up to 100 students",
      "Up to 200 seats",
      "QR attendance",
      "Payment collection",
      "Basic analytics",
      "Email support",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    price: "₹2,499",
    period: "/month",
    description: "For growing libraries",
    features: [
      "Up to 500 students",
      "Up to 1000 seats",
      "All notification channels",
      "Advanced analytics",
      "Custom branding",
      "PDF reports",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For library chains",
    features: [
      "Unlimited students",
      "Unlimited seats",
      "White-label solution",
      "Custom integrations",
      "API access",
      "Dedicated manager",
      "SLA guarantee",
    ],
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">LibraryHub Pro</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Zap className="w-3 h-3 text-indigo-500" />
            <span>Now with AI-powered seat recommendations</span>
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            The Modern Library
            <br />
            <span className="gradient-text">Seat Management Platform</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage seats, students, payments, and attendance with one powerful SaaS platform. 
            Built for modern library owners who want to grow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="xl" asChild>
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/login">View Demo →</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to run a library
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From seat assignment to fee collection — all in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-border/50 bg-card hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seat Map Preview */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Seat Map</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Visual Seat Management
            </h2>
            <p className="text-muted-foreground text-lg">
              Movie-ticket style seat selection with real-time status
            </p>
          </div>

          {/* Mock Seat Map */}
          <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border/50 p-8">
            <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
              {[
                { color: "bg-emerald-500", label: "Available" },
                { color: "bg-rose-500", label: "Occupied" },
                { color: "bg-amber-500", label: "Reserved" },
                { color: "bg-slate-500", label: "Maintenance" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: 40 }, (_, i) => {
                const statuses = ["available", "available", "available", "occupied", "occupied", "reserved", "available", "maintenance"];
                const status = statuses[i % statuses.length];
                const colors = {
                  available: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30",
                  occupied: "bg-rose-500/20 border-rose-500/40 text-rose-400",
                  reserved: "bg-amber-500/20 border-amber-500/40 text-amber-400",
                  maintenance: "bg-slate-500/20 border-slate-500/40 text-slate-500",
                };
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg border text-xs font-bold flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${colors[status as keyof typeof colors]}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free, scale as you grow. No hidden charges.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                plan.highlight
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-violet-500/5 shadow-xl shadow-indigo-500/10"
                  : "border-border/50 bg-card hover:border-indigo-500/30"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "default" : "outline"}
                className="w-full"
                asChild
              >
                <Link href="/signup">
                  {plan.price === "Custom" ? "Contact Us" : "Start Free Trial"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to modernize your library?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join 2,400+ library owners who have already switched to LibraryHub Pro.
          </p>
          <Button size="xl" asChild>
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold gradient-text">LibraryHub Pro</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Built with ♥ for Indian Libraries</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

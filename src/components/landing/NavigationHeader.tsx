import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Activity,
  Menu,
  Users,
  Calendar,
  CreditCard,
  Plug,
  BarChart3,
  Building2,
  Stethoscope,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const featureItems = [
  {
    title: 'Patient Management',
    description: 'Unified EMR accessible across all departments',
    href: '#features',
    icon: Users,
  },
  {
    title: 'OPD/IPD Management',
    description: 'Streamlined outpatient and inpatient workflows',
    href: '#features',
    icon: Building2,
  },
  {
    title: 'Billing & Revenue',
    description: 'Automated billing, claims, and AR tracking',
    href: '#features',
    icon: CreditCard,
  },
  {
    title: 'Integrations',
    description: 'Connect with pharmacy, lab, and PACS systems',
    href: '#features',
    icon: Plug,
  },
  {
    title: 'Analytics',
    description: 'Real-time dashboards and reporting',
    href: '#features',
    icon: BarChart3,
  },
];

export function NavigationHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">AROCORD-HIMS</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent">
                Features
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[500px] gap-3 p-4 md:grid-cols-2">
                  {featureItems.map((item) => (
                    <li key={item.title}>
                      <NavigationMenuLink asChild>
                        <a
                          href={item.href}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#pricing"
                className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#security"
                className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                Security
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#faq"
                className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                Resources
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/hospital/login">Sign In</Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/hospital/signup">
              <Stethoscope className="w-4 h-4 mr-2" />
              Book Demo
            </Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                  <Activity className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold">AROCORD-HIMS</span>
              </div>

              {/* Mobile Nav Links */}
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">Features</div>
                {featureItems.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm">{item.title}</span>
                  </a>
                ))}
              </div>

              <div className="h-px bg-border" />

              <a
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Pricing
              </a>
              <a
                href="#security"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Security
              </a>
              <a
                href="#faq"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Resources
              </a>

              <div className="h-px bg-border" />

              <div className="flex flex-col gap-3 mt-4">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/hospital/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="hero" asChild className="w-full">
                  <Link to="/hospital/signup" onClick={() => setMobileOpen(false)}>
                    Book Demo
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

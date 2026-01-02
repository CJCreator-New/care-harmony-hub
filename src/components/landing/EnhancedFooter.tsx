import { Link } from 'react-router-dom';
import { Activity, Linkedin, Twitter, Youtube, ExternalLink } from 'lucide-react';

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Modules', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '#features' },
      { label: 'API Documentation', href: '#' },
      { label: 'Security', href: '#security' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Case Studies', href: '#' },
      { label: 'Customers', href: '#testimonials' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Video Tutorials', href: '#' },
      { label: 'Implementation Guide', href: '#' },
      { label: 'System Status', href: '#', external: true },
      { label: 'Help Center', href: '#' },
      { label: 'Download Brochure', href: '#' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Security & Compliance', href: '#security' },
      { label: 'HIPAA Documentation', href: '#' },
      { label: 'NABH Compliance', href: '#' },
      { label: 'Data Processing Agreement', href: '#' },
    ],
  },
};

const socialLinks = [
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function EnhancedFooter() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-sidebar-primary-foreground">
                AROCORD-HIMS
              </span>
            </Link>
            <p className="text-sm text-sidebar-foreground/70 mb-6 max-w-xs">
              Modern hospital management platform built for safer patient care and operational excellence.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-accent hover:bg-sidebar-primary transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-sidebar-primary-foreground mb-4">
                {column.title}
              </h4>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-sidebar-foreground/70 hover:text-sidebar-primary-foreground transition-colors flex items-center gap-1"
                    >
                      {link.label}
                      {link.external && <ExternalLink className="w-3 h-3" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-sidebar-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-sidebar-foreground/60">
              © {new Date().getFullYear()} AROCORD Healthcare Solutions. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a 
                href="#" 
                className="text-xs text-sidebar-foreground/60 hover:text-sidebar-primary-foreground transition-colors flex items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                System Status
              </a>
              <a 
                href="#contact" 
                className="text-xs text-sidebar-foreground/60 hover:text-sidebar-primary-foreground transition-colors"
              >
                Contact
              </a>
              <a 
                href="#" 
                className="text-xs text-sidebar-foreground/60 hover:text-sidebar-primary-foreground transition-colors"
              >
                Changelog
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

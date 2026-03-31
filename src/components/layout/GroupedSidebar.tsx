import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { hasAnyAllowedRole, hasPermissionForAnyRole } from '@/lib/permissions';
import { routeManifest, type AppRouteManifestGroup, type AppRouteManifestItem } from '@/config/routeManifest';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface GroupedSidebarProps {
  userRole: UserRole | null;
  testRole?: UserRole | null;
  collapsed?: boolean;
  className?: string;
}

export function GroupedSidebar({ userRole, testRole, collapsed = false, className }: GroupedSidebarProps) {
  const location = useLocation();
  const { roles } = useAuth();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    routeManifest.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        window.location.pathname === item.href ||
        window.location.pathname.startsWith(item.href + '/')
      );
      initial[group.label] = group.defaultExpanded || hasActiveItem || false;
    });
    return initial;
  });

  // Auto-expand the group that contains the currently active route
  useEffect(() => {
    routeManifest.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        location.pathname === item.href ||
        location.pathname.startsWith(item.href + '/')
      );
      if (hasActiveItem) {
        setExpandedGroups(prev => ({ ...prev, [group.label]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const resolvedRoles = testRole
    ? [testRole]
    : roles.length > 0
      ? roles
      : userRole
        ? [userRole]
        : [];

  const hasAccessToGroup = (group: AppRouteManifestGroup) => {
    return hasAnyAllowedRole(resolvedRoles, group.allowedRoles);
  };

  const hasAccessToItem = (item: AppRouteManifestItem) => {
    return hasAnyAllowedRole(resolvedRoles, item.allowedRoles) &&
      (!item.requiredPermission || hasPermissionForAnyRole(resolvedRoles, item.requiredPermission)) &&
      (!item.featureFlag || (!flagsLoading && isEnabled(item.featureFlag as any)));
  };

  const allNavHrefs = routeManifest.flatMap(g => g.items.map(i => i.href));

  const isActive = (href: string) => {
    if (location.pathname === href) return true;
    if (!location.pathname.startsWith(href + '/')) return false;
    // Don't highlight parent when a more-specific sibling nav item matches exactly
    return !allNavHrefs.some(
      other => other !== href && other.startsWith(href + '/') && location.pathname === other
    );
  };

  // ── Collapsed mode: flat icon-only list with tooltips ──────────────────────
  if (collapsed) {
    const collapsedGroups = routeManifest
      .filter(hasAccessToGroup)
      .map((group) => ({
        ...group,
        items: group.items.filter(hasAccessToItem),
      }))
      .filter((group) => group.items.length > 0);

    return (
      <TooltipProvider delayDuration={150}>
        <nav className={cn('flex flex-col items-center gap-1', className)} aria-label="Main navigation">
          {collapsedGroups.map((group, idx) => {
            const isLast = idx === collapsedGroups.length - 1;
            const groupActive = group.items.some((item) => isActive(item.href));
            const firstItem = group.items[0];
            const sep = !isLast && (
              <hr className="w-6 border-sidebar-border my-0.5" aria-hidden="true" />
            );

            if (group.items.length === 1) {
              return (
                <React.Fragment key={group.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={firstItem.href} aria-label={firstItem.label}>
                        <Button
                          className={cn(
                            'w-10 h-10 p-0 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none',
                            isActive(firstItem.href) && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_12px_hsl(var(--sidebar-ring)/0.15)]'
                          )}
                          size="icon"
                          aria-current={isActive(firstItem.href) ? 'page' : undefined}
                        >
                          <firstItem.icon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {firstItem.label}
                    </TooltipContent>
                  </Tooltip>
                  {sep}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={group.label}>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className={cn(
                            'relative w-10 h-10 p-0 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none',
                            groupActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                          size="icon"
                          aria-label={`${group.label} menu`}
                        >
                          <group.icon className="h-4 w-4" />
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {group.label}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-56">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link to={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {sep}
              </React.Fragment>
            );
          })}
        </nav>
      </TooltipProvider>
    );
  }

  const accessibleGroups = routeManifest
    .filter(hasAccessToGroup)
    .map((group) => {
      const accessibleItems = group.items.filter(hasAccessToItem);
      if (accessibleItems.length === 0) return null;

      const isExpanded = expandedGroups[group.label];

      return (
        <Collapsible
          key={group.label}
          open={isExpanded}
          onOpenChange={() => toggleGroup(group.label)}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="w-full justify-between h-auto p-3 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none"
            >
              <div className="flex items-center gap-3">
                <group.icon className="h-4 w-4 text-sidebar-foreground" />
                  <span className="font-sans font-semibold text-[0.65rem] tracking-[0.1em] uppercase text-sidebar-foreground/50">{group.label}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-4">
            {accessibleItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  className={cn(
                    "w-full justify-start h-auto p-2 text-sm text-sidebar-foreground bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none",
                    isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-[hsl(var(--sidebar-ring))] rounded-l-none shadow-[inset_0_0_16px_hsl(var(--sidebar-ring)/0.12)]"
                  )}
                  size="sm"
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    })
    .filter(Boolean); // Remove null entries

  if (accessibleGroups.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-sidebar-foreground/60">
          No navigation items available for your role.
        </p>
        <p className="text-xs text-sidebar-foreground/40 mt-2">
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <nav className={cn("space-y-2", className)}>
      {accessibleGroups}
    </nav>
  );
}

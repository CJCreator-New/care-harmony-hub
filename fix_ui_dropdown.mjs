import fs from 'fs';

const filePath = 'src/pages/appointments/AppointmentsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('DropdownMenu')) {
  // Add import
  content = content.replace("import { Button } from '@/components/ui/button';", 
    "import { Button } from '@/components/ui/button';\nimport { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';\nimport { MoreVertical } from 'lucide-react';");

  // Fix button cells
  const oldButtons = `          <div className="flex justify-end gap-2">
            {appointment.status === "scheduled" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onCheckIn(appointment.id)}
                  disabled={isCheckingIn}
                >
                  Check In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel(appointment.id)}
                >
                  Cancel
                </Button>
              </>
            )}
            {appointment.status === "checked_in" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkNoShow(appointment.id)}
              >
                No Show
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewAudit?.(appointment)}
              title="View appointment history and amendments"
            >
              History
            </Button>
          </div>`;

  const newButtons = `          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {appointment.status === "scheduled" && (
                  <>
                    <DropdownMenuItem onClick={() => onCheckIn(appointment.id)} disabled={isCheckingIn}>
                      Check In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCancel(appointment.id)}>
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
                {appointment.status === "checked_in" && (
                  <DropdownMenuItem onClick={() => onMarkNoShow(appointment.id)}>
                    No Show
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onViewAudit?.(appointment)}>
                  View History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>`;

  content = content.replace(oldButtons, newButtons);
  fs.writeFileSync(filePath, content);
  console.log('Fixed dropdown!');
}

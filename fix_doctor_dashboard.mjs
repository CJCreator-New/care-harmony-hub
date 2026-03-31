import fs from 'fs';

let content = fs.readFileSync('src/components/dashboard/DoctorDashboard.tsx', 'utf-8');

if (!content.includes('RecentActivity')) {
  content = content.replace("import { UpcomingAppointments } from './UpcomingAppointments';", "import { UpcomingAppointments } from './UpcomingAppointments';\nimport { RecentActivity } from './RecentActivity';");

  content = content.replace(`            </CardContent>
          </Card>
        </div>
      </div>
      </TabsContent>`, `            </CardContent>
          </Card>
          <RecentActivity />
        </div>
      </div>
      </TabsContent>`);

  fs.writeFileSync('src/components/dashboard/DoctorDashboard.tsx', content);
  console.log('Added RecentActivity to DoctorDashboard!');
}
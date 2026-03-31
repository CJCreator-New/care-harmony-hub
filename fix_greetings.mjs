import fs from 'fs';

const fixGreeting = (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes("{profile?.last_name?.trim() || 'Doctor'}")) {
    content = content.replace("{profile?.last_name?.trim() || 'Doctor'}", "{profile?.last_name?.replace(/'s$/, '') || profile?.first_name?.replace(/'s$/, '') || 'Doctor'}");
  }
  if (content.includes("{profile?.first_name?.trim() || 'Admin'}")) {
    content = content.replace("{profile?.first_name?.trim() || 'Admin'}", "{profile?.first_name?.split(\"'\")[0]?.trim() || 'Admin'}");
  }
  fs.writeFileSync(file, content);
};

fixGreeting('src/components/dashboard/DoctorDashboard.tsx');
fixGreeting('src/components/dashboard/AdminDashboard.tsx');
console.log('Fixed greetings');

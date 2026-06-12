const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'src/features/classes/components/EnrolledStudentsModal.tsx',
    importPath: '../../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/calendar/AdminCalendarPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/classes/ClassesPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/enrollments/EnrollmentsPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/finances/FinancesPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/plans/PlansPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/students/components/StudentList.tsx',
    importPath: '../../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/students/StudentsPage.tsx',
    importPath: '../../../components/ui/Loader'
  },
  {
    file: 'src/pages/admin/teachers/components/TeacherList.tsx',
    importPath: '../../../../components/ui/Loader'
  },
  {
    file: 'src/pages/onboarding/TeacherOnboardingPage.tsx',
    importPath: '../../components/ui/Loader'
  }
];

replacements.forEach(r => {
  const filepath = path.join(__dirname, r.file);
  if (!fs.existsSync(filepath)) return;
  
  let content = fs.readFileSync(filepath, 'utf8');
  if (!content.includes('import { Loader }')) {
    const importStatement = `import { Loader } from '${r.importPath}';`;
    const lines = content.split('\n');
    let lastImportIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    lines.splice(lastImportIndex + 1, 0, importStatement);
    fs.writeFileSync(filepath, lines.join('\n'));
    console.log(`Updated imports in ${r.file}`);
  }
});

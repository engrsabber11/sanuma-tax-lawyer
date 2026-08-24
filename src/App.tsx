import { Navigate, Route, Routes } from 'react-router-dom'
import { useData } from './data/store'
import { LoginPage } from './pages/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { ClientsList } from './pages/clients/ClientsList'
import { ClientOnboarding } from './pages/clients/ClientOnboarding'
import { ClientProfile } from './pages/clients/ClientProfile'
import { DocumentVault } from './pages/documents/DocumentVault'
import { FilingsPage } from './pages/filings/FilingsPage'
import { ReminderRulesPage } from './pages/reminders/ReminderRulesPage'
import { MattersList } from './pages/matters/MattersList'
import { MatterDetail } from './pages/matters/MatterDetail'
import { ServiceCatalog } from './pages/sales/ServiceCatalog'
import { InvoicesPage } from './pages/sales/InvoicesPage'
import { InvoiceDetail } from './pages/sales/InvoiceDetail'
import { CreditNotesPage } from './pages/creditnotes/CreditNotesPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { AccountingPage } from './pages/accounting/AccountingPage'
import { ReferralsPage } from './pages/referrals/ReferralsPage'
import { SettingsPage } from './pages/settings/SettingsPage'

function App() {
  const { signedIn } = useData()

  // Everything sits behind the picker. Landing straight on the dashboard meant
  // whoever opened the tab arrived as the Partner with full permissions.
  if (!signedIn) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/clients" element={<ClientsList />} />
        <Route path="/clients/new" element={<ClientOnboarding />} />
        <Route path="/clients/:id" element={<ClientProfile />} />

        <Route path="/filings" element={<FilingsPage />} />
        <Route path="/documents" element={<DocumentVault />} />
        <Route path="/reminders" element={<ReminderRulesPage />} />

        <Route path="/matters" element={<MattersList />} />
        <Route path="/matters/:id" element={<MatterDetail />} />

        <Route path="/sales/services" element={<ServiceCatalog />} />
        <Route path="/sales/quotes" element={<InvoicesPage initialTab="quotes" />} />
        <Route path="/sales/invoices" element={<InvoicesPage initialTab="invoices" />} />
        <Route path="/sales/invoices/:id" element={<InvoiceDetail />} />

        <Route path="/credit-notes" element={<CreditNotesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App

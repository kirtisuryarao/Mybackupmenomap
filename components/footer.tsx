import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">About</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cycle Companion helps you track your menstrual health with personalized insights and support.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/home" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Have questions? <br />
              <a href="mailto:support@cyclecompanion.com" className="hover:text-primary">
                support@cyclecompanion.com
              </a>
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Cycle Companion. All rights reserved.</p>
          <p className="mt-2 text-xs">
            This app is for informational purposes and should not replace professional medical advice.
          </p>
        </div>
      </div>
    </footer>
  )
}

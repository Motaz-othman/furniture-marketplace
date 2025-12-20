export default function AuthLayout({ children }) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md p-8">
          {children}
        </div>
      </div>
    );
  }
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-dvh items-center justify-center overflow-y-auto">
      <div className="w-full max-w-md px-4 py-8">{children}</div>
    </div>
  )
}

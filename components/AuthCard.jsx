export default function AuthCard({ title, children }) {
  return (
    <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur bg-white/10 shadow-2xl border border-white/20 text-white">
      <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
      {children}
    </div>
  );
}

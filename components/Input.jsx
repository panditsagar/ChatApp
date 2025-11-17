export default function Input({ label, type = "text", name, value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block mb-1 font-medium text-white">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 placeholder-gray-200 focus:ring-2 focus:ring-cyan-400 outline-none"
      />
    </div>
  );
}

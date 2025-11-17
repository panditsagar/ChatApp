export default function GoogleButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white text-black flex items-center justify-center gap-3 py-3 rounded-lg font-semibold hover:bg-gray-200 transition mt-3"
    >
      <img src="/google.webp" className="w-5 h-5" />
      Continue with Google
    </button>
  );
}

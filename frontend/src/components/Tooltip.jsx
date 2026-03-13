export default function Tooltip({ children, text, enabled }) {
  if (!enabled || !text) return <>{children}</>
  return (
    <span className="relative group/tip inline-block">
      {children}
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5
        hidden group-hover/tip:block z-[9999] w-max max-w-56 px-2 py-1 rounded
        bg-[#161b22] border border-border text-xs text-text-hi shadow-lg
        whitespace-normal text-left leading-snug font-normal">
        {text}
      </span>
    </span>
  )
}

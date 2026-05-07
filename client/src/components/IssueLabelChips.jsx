/** @param {{ labels: Array<{ label_id: string, name: string, color_hex?: string | null }>, className?: string }} props */
export default function IssueLabelChips({ labels, className = '' }) {
  if (!labels?.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {labels.map((lb) => (
        <span
          key={lb.label_id}
          className="inline-flex items-center rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-200 max-w-[140px] truncate"
          style={{
            backgroundColor: lb.color_hex ? `${lb.color_hex}33` : 'rgba(120,229,239,0.12)',
            borderColor: lb.color_hex ? `${lb.color_hex}55` : undefined,
          }}
          title={lb.name}
        >
          {lb.name}
        </span>
      ))}
    </div>
  )
}

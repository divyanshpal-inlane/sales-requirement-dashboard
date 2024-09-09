export default function GreenGradient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-[#00CE84]/70 via-[#D3FFEF]/50 via-15% to-[#FFFFFF] to-30%">
      {children}
    </div>
  );
}

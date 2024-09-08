export default function GreenGradient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="via-13% relative h-full w-full bg-gradient-to-b from-[#00CE84] via-[#D3FFEF]/50 to-[#FFFFFF] to-50%">
      {children}
    </div>
  );
}

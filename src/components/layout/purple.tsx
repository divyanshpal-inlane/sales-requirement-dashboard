export default function PurpleGradient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full bg-gradient-to-b from-[#D1B3FF]/60 via-[#ECDFFF] via-10% to-[#FFFFFF] to-20%">
      {children}
    </div>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  align?: 'left' | 'center';
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <div className={`section-heading ${align === 'center' ? 'center' : ''}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {copy ? <p className="lead">{copy}</p> : null}
    </div>
  );
}

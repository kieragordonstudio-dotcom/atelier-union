import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type FAQItem = {
  question: string;
  answer: string;
};

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-answer-${index}`;
        return (
          <article className="faq-item" key={item.question}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <h3>{item.question}</h3>
              <ChevronDown
                aria-hidden="true"
                size={20}
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--transition-fast)',
                }}
              />
            </button>
            {isOpen ? (
              <div id={panelId} className="faq-answer">
                <p>{item.answer}</p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

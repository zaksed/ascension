/**
 * Rendu des documents écrits (Parties 6-7, Compréhension de textes).
 * Conventions : {{n}} = blanc n° n ; [[n]] = position d'insertion ; chat « Nom (heure) : texte ».
 */
import type { ReactNode } from 'react';
import type { Passage } from '../../content/schema';
import { TableView } from './MediaView';

const KIND_LABEL: Record<string, string> = {
  email: 'E-mail',
  letter: 'Letter',
  memo: 'Memo',
  notice: 'Notice',
  advertisement: 'Advertisement',
  article: 'Article',
  chat: 'Online chat',
  'text-message': 'Text messages',
  form: 'Form',
  invoice: 'Invoice',
  schedule: 'Schedule',
  webpage: 'Web page',
  review: 'Review',
  text: '',
};

function inline(text: string, opts: { currentBlank?: number; blankLabels?: (n: number) => string }): ReactNode[] {
  const parts = text.split(/(\{\{\d\}\}|\[\[\d\]\])/g);
  return parts.map((p, i) => {
    const blank = /^\{\{(\d)\}\}$/.exec(p);
    if (blank) {
      const n = Number(blank[1]);
      return (
        <span key={i} className={`blank ${opts.currentBlank === n ? 'blank-current' : ''}`} aria-label={`Blanc ${n}`}>
          {opts.blankLabels?.(n) ?? `(${n})`}
        </span>
      );
    }
    const marker = /^\[\[(\d)\]\]$/.exec(p);
    if (marker) {
      return (
        <span key={i} className="marker" aria-label={`Position ${marker[1]}`}>
          [{marker[1]}]
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function ChatView({ body, kind }: { body: string; kind: string }) {
  const lines = body.split('\n').filter(Boolean);
  const speakers: string[] = [];
  return (
    <ol className="space-y-2 list-none p-0 m-0" aria-label={KIND_LABEL[kind]}>
      {lines.map((line, i) => {
        const m = /^(.+?) \(([^)]+)\)\s*:\s*(.*)$/.exec(line);
        if (!m) return <li key={i}>{line}</li>;
        const [, name, time, text] = m;
        if (!speakers.includes(name)) speakers.push(name);
        const idx = speakers.indexOf(name);
        const tones = ['bg-brand-soft', 'bg-accent-soft', 'bg-tm-soft', 'bg-ok-soft'];
        return (
          <li key={i} className={`rounded-xl px-3 py-2 ${tones[idx % tones.length]} ${idx % 2 ? 'ml-6' : 'mr-6'}`}>
            <div className="text-xs font-semibold text-muted">
              {name} <span className="font-normal">· {time}</span>
            </div>
            <div>{text}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function PassageView({ passage, currentBlank, lang = 'en', blankLabels }: { passage: Passage; currentBlank?: number; lang?: string; blankLabels?: (n: number) => string }) {
  const label = KIND_LABEL[passage.kind];
  const isChat = passage.kind === 'chat' || passage.kind === 'text-message';
  return (
    <article lang={lang} className="rounded-xl border border-line bg-surface p-4 reading">
      {(label || passage.title) && (
        <header className="mb-2">
          {label && <div className="text-[0.7rem] uppercase tracking-wider text-muted font-semibold">{label}</div>}
          {passage.title && <h3 className="font-bold text-[1.02rem] leading-snug">{passage.title}</h3>}
        </header>
      )}
      {passage.meta && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm mb-3 pb-2 border-b border-line">
          {Object.entries(passage.meta).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted font-medium">{k}:</dt>
              <dd className="m-0">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {isChat ? (
        <ChatView body={passage.body} kind={passage.kind} />
      ) : (
        passage.body.split('\n\n').map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {inline(para, { currentBlank, blankLabels })}
          </p>
        ))
      )}
      {passage.table && (
        <div className="mt-3">
          <TableView table={passage.table} />
        </div>
      )}
    </article>
  );
}

export function PassageList({ passages, currentBlank, lang, blankLabels }: { passages: Passage[]; currentBlank?: number; lang?: string; blankLabels?: (n: number) => string }) {
  return (
    <div className="space-y-3">
      {passages.map((p, i) => (
        <div key={i}>
          {passages.length > 1 && <div className="text-xs font-semibold text-muted mb-1">Document {i + 1} / {passages.length}</div>}
          <PassageView passage={p} currentBlank={currentBlank} lang={lang} blankLabels={blankLabels} />
        </div>
      ))}
    </div>
  );
}

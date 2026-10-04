import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { useI18n } from '@/i18n/I18nProvider';
import NotFound from './NotFound';

const docs = import.meta.glob('../legal/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

export default function Legal() {
  const { doc = '' } = useParams();
  const { locale } = useI18n();
  const text = docs[`../legal/${doc}.${locale}.md`] ?? docs[`../legal/${doc}.mn.md`];
  if (!text) return <NotFound />;
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-10 [&_blockquote]:my-4 [&_blockquote]:rounded-xl [&_blockquote]:bg-amber-50 [&_blockquote]:p-3 [&_blockquote]:text-amber-900 dark:[&_blockquote]:bg-amber-900/20 dark:[&_blockquote]:text-amber-200 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:text-left">
      <Markdown>{text}</Markdown>
    </article>
  );
}

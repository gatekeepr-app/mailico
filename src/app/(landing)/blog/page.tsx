import { getAllPosts } from '@/lib/blogs'
import Link from 'next/link'

export const dynamic = 'force-static' // ensure static generation

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main className='mx-32 px-4 py-12'>
      <header className='mb-8'>
        <h1 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'>
          Blog
        </h1>
        <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>
          Updates, product notes & experiments from the Mailico team.
        </p>
      </header>

      <div className='grid grid-cols-3 gap-5'>
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className='block rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5'
          >
            <div className='flex flex-col gap-1'>
              <h2 className='text-lg font-medium text-slate-900 dark:text-white'>
                {post.title}
              </h2>
              {post.date && (
                <span className='text-xs text-slate-500 dark:text-slate-400'>
                  {new Date(post.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                  })}
                </span>
              )}
              {post.excerpt && (
                <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
                  {post.excerpt}
                </p>
              )}
              <span className='mt-2 text-xs font-medium text-slate-500 dark:text-slate-400'>
                Read more →
              </span>
            </div>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className='text-sm text-slate-500 dark:text-slate-400'>
            No posts yet. Check back soon.
          </p>
        )}
      </div>
    </main>
  )
}

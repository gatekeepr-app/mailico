import { getAllPosts } from '@/lib/blogs'
import Link from 'next/link'

export const dynamic = 'force-static'

const videoSrc =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

const navLinks = ['Product', 'Developers', 'Pricing', 'Resources']

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main className='min-h-screen bg-[#020202] text-white'>
      <section className='relative isolate overflow-hidden text-white'>
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className='absolute inset-0 h-full w-full object-cover'
        />
        <div className='absolute inset-0 bg-black/60' />

        <div className='relative flex min-h-[40vh] flex-col'>
          <header className='flex items-center justify-between px-[120px] py-[20px] max-xl:px-16 max-lg:px-12 max-md:px-6 max-md:py-4'>
            <div className='flex flex-1 items-center gap-10 max-md:gap-4'>
              <Link
                href='/'
                className='text-[20px] font-semibold tracking-[0.25em]'
                style={{ width: 187, height: 25 }}
              >
                MAILICO
              </Link>
              <nav className='hidden items-center gap-[30px] text-[14px] font-medium md:flex'>
                {navLinks.map(link => {
                  const href =
                    link === 'Pricing'
                      ? '/pricing'
                      : link === 'Product'
                        ? '/'
                        : link === 'Developers'
                          ? '/changelog'
                          : link === 'Resources'
                            ? '/blog'
                            : '/'
                  return (
                    <Link
                      key={link}
                      href={href}
                      className='flex items-center gap-[14px] text-white transition hover:text-white/80'
                    >
                      <span>{link}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className='flex items-center gap-3 text-sm font-medium'>
              <Link
                href='/auth?mode=signin'
                className='hidden text-white/70 transition hover:text-white md:inline-flex'
              >
                Log in
              </Link>
              <Link
                href='/auth?mode=signup'
                className='inline-flex items-center rounded-full border border-white/70 px-5 py-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.35)] transition hover:bg-white/10'
              >
                Create account
              </Link>
            </div>
          </header>

          <div className='flex flex-1 items-center justify-center px-6 pb-[102px] pt-[140px] max-md:pb-[80px] max-md:pt-[120px]'>
            <div className='flex w-full max-w-[820px] flex-col items-center gap-6 text-center'>
              <h1 className='text-[48px] font-medium leading-[1.2] max-md:text-[32px]'>
                Blog
              </h1>
              <p className='max-w-[680px] text-[15px] font-normal text-white/70'>
                Updates, product notes & experiments from the Mailico team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className='mx-32 px-4 py-12'>
        <div className='grid grid-cols-3 gap-5'>
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className='block rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md'
            >
              <div className='flex flex-col gap-1'>
                <h2 className='text-lg font-medium text-white'>{post.title}</h2>
                {post.date && (
                  <span className='text-xs text-white/50'>
                    {new Date(post.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit'
                    })}
                  </span>
                )}
                {post.excerpt && (
                  <p className='mt-1 text-sm text-white/60'>{post.excerpt}</p>
                )}
                <span className='mt-2 text-xs font-medium text-white/50'>
                  Read more →
                </span>
              </div>
            </Link>
          ))}

          {posts.length === 0 && (
            <p className='text-sm text-white/50'>
              No posts yet. Check back soon.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

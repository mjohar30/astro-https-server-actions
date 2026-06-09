import type { APIRoute, GetStaticPaths } from 'astro';
import { getEntry } from 'astro:content';
import { db, eq, Posts } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const postId = params.id;

  const posts = await db.select().from(Posts).where(eq(Posts.id, String(postId)))

  if(posts.length === 0){
    const post = {
      id: postId,
      title: 'Post not found',
      likes: 0
    }
    return new Response(JSON.stringify(post), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }


  return new Response(JSON.stringify(posts.at(0)), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const postId = params.id;

  const posts = await db.select().from(Posts).where(eq(Posts.id, String(postId)))
  const { likes = 0 } = await request.json()

  if(posts.length === 0){
    const newPost = {
      id: String(postId),
      title: 'Post not found',
      likes: 0
    }

    await db.insert(Posts).values(newPost)

    posts.push(newPost)
  }

  const post = posts.at(0)
  if (!post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  post.likes = post.likes + likes
  await db.update(Posts).set(post).where(eq(Posts.id, String(postId)))


  return new Response(JSON.stringify(post), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
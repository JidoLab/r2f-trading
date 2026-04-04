export default function ReadingTime({ content }: { content: string }) {
  // Average reading speed: 200 words per minute
  const words = content.replace(/export\s+const\s+metadata[\s\S]*?\n\}/, "").split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  return (
    <span className="text-sm text-gray-400">
      {minutes} min read
    </span>
  );
}

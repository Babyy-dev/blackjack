import sprite from '@/assets/sprite.svg?raw'

const SvgSprite = () => {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />
}

export default SvgSprite

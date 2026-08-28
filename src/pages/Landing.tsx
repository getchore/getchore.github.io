import { Cta } from '../components/Footer'
import { Dogfood } from '../components/Dogfood'
import { Features } from '../components/Features'
import { Hero } from '../components/Hero'
import { Reference } from '../components/Reference'
import { Replaces } from '../components/Replaces'
import { Script } from '../components/Script'
import { Showcase } from '../components/Showcase'
import { Versus } from '../components/Versus'

export function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <Replaces />
      <Script />
      <Versus />
      <Showcase />
      <Dogfood />
      <Reference />
      <Cta />
    </>
  )
}

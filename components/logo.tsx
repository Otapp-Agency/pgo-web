import Link from 'next/link'
import Image from 'next/image'


export const Logo = () => {
    return (
        <Link href="/" className="flex items-center gap-2">
            <Image src="/logoipsum.svg" alt="Logo" width={32} height={32} />
            <span className="text-2xl font-bold">PGO</span>
        </Link>
    )
}
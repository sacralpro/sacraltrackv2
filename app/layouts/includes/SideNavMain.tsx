import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useUser } from "@/app/context/user"
import ClientOnly from "@/app/components/ClientOnly"
import { useGeneralStore } from "@/app/stores/general"
import { useRouter } from "next/navigation"
import { ProfilePageTypes } from "@/app/types"
import { useProfileStore } from "@/app/stores/profile"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"



export default function SideNavMain({ params }: ProfilePageTypes) {
    const contextUser = useUser()
    const router = useRouter()
    const pathname = usePathname()

    let { setCurrentProfile, currentProfile } = useProfileStore()
    let { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore()

    useEffect(() => {
        setCurrentProfile(params?.id)
    
    }, [])
 
    return (
        <>
                    <div 
                        id="SideNavMain" 
                        className={`
                            fixed bottom-[20px] md:top-[83px] z-[99] bg-[#272B43] md:pt-[10px]  
                            overflow-hidden md:p-[20px] rounded-2xl justify-bottom
                            md:flex md:flex-col items-center w-[40%] md:w-[44%] md:z-0 md:h-[276px] h-[80px] 
                            shadow-[0_20px_20px_rgba(0,0,0,0.2)]
                        `}
                    >   

                        {/*Profile image*/}
                        <div className="2xl:mx-auto">

                        <div className="flex items-center md:flex-col">

                        <ClientOnly>
                                {currentProfile ? (
                                    <img className="md:absolute bottom-0 left-0 md:mt-[5px] w-[80px] md:w-full md:max-h-[240px] object-cover rounded-2xl" 
                                    src={currentProfile.image && currentProfile.image.trim() 
                                        ? createBucketUrl(currentProfile.image, 'user') 
                                        : '/images/placeholders/user-placeholder.svg'} 
                                    style={{ boxShadow: '0px 10px 10px -10px rgba(0, 0, 0, 0.3)' }} />
                                ) : (
                                    <img src="/images/placeholders/user-placeholder.svg" className="min-w-full max-h-[300px] rounded-xl" />
                                )}
                            </ClientOnly>


                            <ClientOnly>
                                {currentProfile?.name ? (
                                    <div>
                                        <p className="text-[14px] ml-6 font-bold truncate">{currentProfile?.name}</p>
                                    </div>
                                ) : (
                                    <div className="h-[14px]">
                                    <p>User Name</p>
                                    </div>
                                )} 
                            </ClientOnly>

                          

                        </div>


                        <div className="pb-2"></div>
                        </div>

                        </div>
                        </>
)
}

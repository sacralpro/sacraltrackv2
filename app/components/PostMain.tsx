"use client";

import Link from "next/link";
import PostMainLikes from "./PostMainLikes";
import React, { useEffect, useState, memo, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import useCreateBucketUrl from "../hooks/useCreateBucketUrl";
import { PostMainCompTypes } from "../types";
import { usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import getStripe from '@/libs/getStripe';
import { usePlayerContext } from '@/app/context/playerContext';
import { AudioPlayer } from '@/app/components/AudioPlayer';
import Image from 'next/image';
import { FiShare2 } from 'react-icons/fi';
import { HiMusicNote } from 'react-icons/hi';
import { FaPlay, FaPause } from 'react-icons/fa';
import ShareModal from './ShareModal';
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import useCheckPurchasedTrack from '@/app/hooks/useCheckPurchasedTrack';
import { useCommentStore } from "@/app/stores/comment";
import FloatingComments from '@/app/components/FloatingComments';
import { CommentWithProfile } from "@/app/types";
import { motion, AnimatePresence } from "framer-motion";

// Toast styles
const successToast = (message: string) => toast.success(message, {
  style: {
    background: 'rgba(46, 36, 105, 0.9)',
    color: '#fff',
    borderLeft: '4px solid #20DDBB',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  icon: '🎵',
  duration: 3000,
});

const errorToast = (message: string) => toast.error(message, {
  style: {
    background: 'rgba(46, 36, 105, 0.9)',
    color: '#fff',
    borderLeft: '4px solid #ff5e5b',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  icon: '❌',
  duration: 4000,
});

interface Comment {
    id: string;
    user: {
        name: string;
        image: string;
    };
    text: string;
    created_at: string;
}

interface PostHeaderProps {
    profile: {
        user_id: string;
        name: string;
        image: string;
    };
    avatarUrl: string;
    avatarError: boolean;
    setAvatarError: (error: boolean) => void;
    text: string;
    genre: string;
}

interface PostImageProps {
    imageUrl: string;
    imageError: boolean;
    comments: CommentWithProfile[];
    isPlaying: boolean;
    onTogglePlay: () => void;
    post: any;
}

// Sound wave animation component
const SoundWave = memo(() => {
  return (
    <div className="flex items-center justify-center space-x-1 h-12 absolute bottom-4 left-0 right-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-white/70 rounded-full"
          initial={{ height: 4 }}
          animate={{ 
            height: [4, 12 + Math.random() * 8, 4],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
});

SoundWave.displayName = 'SoundWave';

const PostHeader = memo(({ profile, avatarUrl, avatarError, setAvatarError, text, genre }: PostHeaderProps) => (
    <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Link href={`/profile/${profile.user_id}`} aria-label={`Visit ${profile.name}'s profile`}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#20DDBB]/30 transition-all hover:border-[#20DDBB] duration-300">
                    <img
                        className="w-full h-full object-cover"
                        src={avatarError ? '/images/placeholder-user.jpg' : avatarUrl}
                        alt={`${profile.name}'s profile picture`}
                        onError={() => setAvatarError(true)}
                        loading="lazy"
                        width={48}
                        height={48}
                    />
                </div>
            </Link>
            <div>
                <Link href={`/profile/${profile.user_id}`} className="text-white font-medium hover:underline hover:text-[#20DDBB] transition-colors">
                    {profile.name}
                </Link>
                <div className="flex items-center gap-2">
                    <p className="text-[#818BAC] text-sm">{text}</p>
                    <HiMusicNote className="text-[#20DDBB] text-xs" aria-hidden="true" />
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[#20DDBB] text-xs px-3 py-1 bg-[#20DDBB]/10 rounded-full uppercase font-medium">{genre}</span>
        </div>
    </div>
));

PostHeader.displayName = 'PostHeader';

const PostImage = memo(({ imageUrl, imageError, comments, isPlaying, onTogglePlay, post }: PostImageProps) => (
    <div className="relative w-full group">
        <div 
            className="w-full aspect-square bg-cover bg-center relative overflow-hidden transition-transform duration-300"
            style={{ 
                backgroundImage: imageError ? 
                    'linear-gradient(45deg, #2E2469, #351E43)' : 
                    `url(${imageUrl})`
            }}
            aria-label={`Track artwork for ${post.trackname}`}
            role="img"
        >
            {imageError && <PostImageFallback />}
            
            {/* Mobile Play Button (only shows on smaller screens) */}
            <button 
                onClick={onTogglePlay}
                className="absolute inset-0 md:hidden flex items-center justify-center"
                aria-label={isPlaying ? 'Pause track' : 'Play track'}
                type="button"
            >
                <div className={`
                    w-20 h-20 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center
                    transform transition-all duration-300 ${isPlaying ? 'scale-90 bg-[#20DDBB]/30' : 'scale-100'}
                `}>
                    {isPlaying ? (
                        <FaPause className="text-white text-2xl" aria-hidden="true" />
                    ) : (
                        <FaPlay className="text-white text-2xl ml-1" aria-hidden="true" />
                    )}
                </div>
            </button>
            
            {/* Audio waves when playing */}
            <AnimatePresence>
                {isPlaying && <SoundWave />}
            </AnimatePresence>
            
            {/* Floating Comments */}
            {comments.length > 0 && (
                <FloatingComments comments={comments.map(comment => ({
                    id: comment.id,
                    text: comment.text,
                    created_at: comment.created_at,
                    profile: comment.profile
                }))} />
            )}
        </div>
    </div>
));

PostImage.displayName = 'PostImage';

const PostImageFallback = memo(() => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
            <Image 
                src="/images/T-logo.svg" 
                alt="Default image" 
                width={64}
                height={64}
                className="opacity-20"
                priority={false}
            />
            <div className="mt-4 w-32 h-[1px] bg-white/10"></div>
            <div className="mt-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className="h-1 bg-white/10 rounded"
                        style={{
                            width: `${Math.random() * 100 + 100}px`
                        }}
                    ></div>
                ))}
            </div>
        </div>
    </div>
));

PostImageFallback.displayName = 'PostImageFallback';

const PostMainSkeleton = memo(() => (
  <div className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto shadow-lg shadow-black/20">
    {/* Header skeleton */}
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#2D2D44] animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 bg-[#2D2D44] rounded-lg w-32 animate-pulse"></div>
          <div className="h-3 bg-[#2D2D44] rounded-lg w-24 animate-pulse"></div>
        </div>
      </div>
      <div className="h-4 bg-[#2D2D44] rounded-lg w-16 animate-pulse"></div>
    </div>

    {/* Image skeleton with logo */}
    <div className="relative w-full">
      <div className="w-full aspect-square bg-[#2D2D44] animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Image 
              src="/images/T-logo.svg" 
              alt="Default" 
              width={64}
              height={64}
              className="opacity-20"
            />
            <div className="mt-4 w-32 h-[1px] bg-white/10"></div>
            <div className="mt-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-1 bg-white/10 rounded"
                  style={{
                    width: `${Math.random() * 100 + 100}px`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Audio player skeleton */}
    <div className="px-4 py-2">
      <div className="h-12 bg-[#2D2D44] rounded-lg animate-pulse"></div>
    </div>

    {/* Actions skeleton */}
    <div className="px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2D2D44] rounded-lg animate-pulse"></div>
          <div className="w-12 h-4 bg-[#2D2D44] rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-10 bg-[#2D2D44] rounded-lg animate-pulse"></div>
        <div className="w-10 h-10 bg-[#2D2D44] rounded-lg animate-pulse"></div>
      </div>
    </div>
  </div>
));

PostMainSkeleton.displayName = 'PostMainSkeleton';

const PostMain = memo(({ post }: PostMainCompTypes) => {
    const [imageError, setImageError] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isPurchased, setIsPurchased] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Refs to avoid re-renders
    const imageUrlRef = useRef('');
    const avatarUrlRef = useRef('');
    const m3u8UrlRef = useRef('');
    
    // Memoized values to prevent unnecessary recalculations
    const userContext = useUser();
    const { setIsLoginOpen } = useGeneralStore();
    const { currentAudioId, setCurrentAudioId, isPlaying: globalIsPlaying, togglePlayPause } = usePlayerContext();
    const { checkIfTrackPurchased } = useCheckPurchasedTrack();
    const { commentsByPost, setCommentsByPost, getCommentsByPostId } = useCommentStore();
    const cardRef = useRef<HTMLDivElement>(null);
    
    // Calculate URLs only once when post changes
    useEffect(() => {
        if (post) {
            imageUrlRef.current = useCreateBucketUrl(post.image_url);
            avatarUrlRef.current = useCreateBucketUrl(post.profile?.image);
            m3u8UrlRef.current = useCreateBucketUrl(post.m3u8_url);
        }
    }, [post]);

    // Pre-load images only once
    useEffect(() => {
        const loadImage = (url: string, setError: (error: boolean) => void) => {
            if (typeof window !== 'undefined' && url) {
                const img = new window.Image();
                img.src = url;
                img.onerror = () => setError(true);
                img.onload = () => setError(false);
            }
        };

        if (imageUrlRef.current) loadImage(imageUrlRef.current, setImageError);
        if (avatarUrlRef.current) loadImage(avatarUrlRef.current, setAvatarError);
    }, [imageUrlRef.current, avatarUrlRef.current]);

    // Check if track is purchased
    useEffect(() => {
        const checkPurchaseStatus = async () => {
            if (userContext?.user && post?.id) {
                const purchased = await checkIfTrackPurchased(userContext.user.id, post.id);
                setIsPurchased(purchased);
            }
        };
        
        checkPurchaseStatus();
    }, [userContext?.user, post?.id]);

    // Simulate loading time
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // Reduced from 1000ms to 500ms for faster loading

        return () => clearTimeout(timer);
    }, []);

    // Load comments
    useEffect(() => {
        const loadData = async () => {
            if (post?.id) {
                await setCommentsByPost(post.id);
            }
        };
        
        // Debounce comments loading for performance
        const timer = setTimeout(() => {
            loadData();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [post?.id]);

    // Control playback using the global player context
    useEffect(() => {
        // Update local playing state based on global state
        setIsPlaying(currentAudioId === post?.id && globalIsPlaying);
    }, [currentAudioId, globalIsPlaying, post?.id]);

    // Memoized toggle play handler to prevent re-creation on each render
    const handleTogglePlay = useCallback(() => {
        if (!post) return;
        
        if (currentAudioId !== post.id) {
            // If a different track is playing, switch to this one
            setCurrentAudioId(post.id);
            if (!globalIsPlaying) {
                togglePlayPause();
            }
            successToast(`Now playing: ${post.trackname}`);
        } else {
            // If this track is already selected, just toggle play/pause
            togglePlayPause();
        }
    }, [currentAudioId, post?.id, globalIsPlaying, togglePlayPause, setCurrentAudioId]);

    // Handle intersection observer for lazy loading
    useEffect(() => {
        if (!cardRef.current || !window.IntersectionObserver) return;
      
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsLoading(false);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
      
        observer.observe(cardRef.current);
        
        return () => {
            observer.disconnect();
        };
    }, []);

    // Early return if no post
    if (!post) {
        return <PostMainSkeleton />;
    }

    // If still loading, show skeleton
    if (isLoading) {
        return <PostMainSkeleton />;
    }

    // Stripe checkout handler
    const handlePurchase = async () => {
        if (!userContext?.user) {
            setIsLoginOpen(true);
            return;
        }

        if (isProcessingPayment) return;

        try {
            setIsProcessingPayment(true);
            successToast("Processing your purchase...");

            const stripe = await getStripe();
            if (!stripe) {
                errorToast("Couldn't load payment processor. Please try again later.");
                return;
            }

            const response = await fetch("/api/checkout_sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    trackId: post.id,
                    trackName: post.trackname,
                    userId: userContext.user.id,
                    authorId: post.profile.user_id,
                    image: post.image_url,
                    audio: post.audio_url,
                    amount: 200 // Fixed price in cents ($2.00)
                }),
            });

            if (!response.ok) {
                throw new Error('Payment initialization failed');
            }

            const data = await response.json();

            const { error } = await stripe.redirectToCheckout({
                sessionId: data.session.id
            });

            if (error) {
                throw error;
            }

        } catch (error: any) {
            console.error('Purchase error:', error);
            errorToast("We couldn't process your payment. Please try again.");
        } finally {
            setIsProcessingPayment(false);
        }
    };
        
    const handleShare = () => {
        setIsShareModalOpen(true);
        successToast("Ready to share this awesome track!");
    };

    // SEO-friendly current URL for sharing
    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/post/${post.user_id}/${post.id}`
        : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-[#24183d] rounded-2xl overflow-hidden mb-6 w-full max-w-[100%] md:w-[450px] mx-auto shadow-lg shadow-black/20"
        >
            {/* Hidden schema.org metadata for SEO */}
            <meta itemProp="name" content={post.trackname} />
            <meta itemProp="byArtist" content={post.profile.name} />
            <meta itemProp="genre" content={post.genre} />
            {post.description && <meta itemProp="description" content={post.description} />}
            <link itemProp="url" href={shareUrl} />
            <meta itemProp="inLanguage" content="en" />
            
            <PostHeader 
                profile={post.profile}
                avatarUrl={avatarUrlRef.current}
                avatarError={avatarError}
                setAvatarError={setAvatarError}
                text={post.trackname}
                genre={post.genre}
            />

            <PostImage 
                imageUrl={imageUrlRef.current} 
                imageError={imageError} 
                comments={post?.id ? getCommentsByPostId(post.id) : []}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                post={post}
            />

            <div className="px-4 py-2 w-full">
                <AudioPlayer 
                    m3u8Url={m3u8UrlRef.current} 
                    isPlaying={isPlaying} 
                    onPlay={() => {
                        if (currentAudioId !== post.id) {
                            setCurrentAudioId(post.id);
                        }
                        togglePlayPause();
                    }} 
                    onPause={() => {
                        if (currentAudioId === post.id) {
                            togglePlayPause();
                        }
                    }} 
                />
            </div>

            <div className="px-4 py-3 flex justify-between items-center w-full">
                <div className="flex items-center gap-6">
                    <PostMainLikes post={post} />
                </div>

                <div className="flex items-center gap-3">
                    {!isPurchased ? (
                        <motion.button 
                            onClick={handlePurchase}
                            disabled={isProcessingPayment}
                            className="bg-gradient-to-r from-[#20DDBB] to-[#018CFD] text-white px-6 py-2.5 rounded-xl font-medium 
                                      shadow-lg shadow-[#20DDBB]/20 hover:shadow-xl hover:shadow-[#20DDBB]/30 
                                      transition-all duration-300 flex items-center gap-2"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            aria-label={`Buy track ${post.trackname} for $2`}
                        >
                            <span className="text-lg">$2</span>
                            <span className="font-semibold">Buy Track</span>
                            {isProcessingPayment && (
                                <motion.div
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </motion.button>
                    ) : (
                        <motion.button 
                            className="bg-gradient-to-r from-[#20DDBB]/20 to-[#018CFD]/20 text-[#20DDBB] px-6 py-2.5 
                                      rounded-xl font-medium border border-[#20DDBB]/30 flex items-center gap-2"
                            whileHover={{ scale: 1.01 }}
                            aria-label="Track already purchased"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-semibold">Purchased</span>
                        </motion.button>
                    )}
                    <motion.button 
                        onClick={handleShare}
                        className="text-white p-3 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#20DDBB] transition-colors"
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Share track ${post.trackname}`}
                    >
                        <FiShare2 size={20} aria-hidden="true" />
                    </motion.button>
                </div>
            </div>

            <ShareModal 
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                post={post}
            />
        </motion.div>
    );
});

PostMain.displayName = 'PostMain';

export default PostMain;


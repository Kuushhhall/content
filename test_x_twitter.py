#!/usr/bin/env python3
"""
Test script for X (Twitter) API connectivity.
Tests OAuth 1.0a authentication and tweet posting capability.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from dotenv import load_dotenv
import tweepy

# Load environment variables
load_dotenv(Path(__file__).parent / "backend" / ".env")

def test_credentials():
    """Test if all required credentials are present."""
    print("=" * 60)
    print(" CHECKING X/TWITTER CREDENTIALS")
    print("=" * 60)
    
    credentials = {
        "TWITTER_API_KEY": os.getenv("TWITTER_API_KEY"),
        "TWITTER_API_SECRET": os.getenv("TWITTER_API_SECRET"),
        "TWITTER_ACCESS_TOKEN": os.getenv("TWITTER_ACCESS_TOKEN"),
        "TWITTER_ACCESS_TOKEN_SECRET": os.getenv("TWITTER_ACCESS_TOKEN_SECRET"),
        "TWITTER_BEARER_TOKEN": os.getenv("TWITTER_BEARER_TOKEN"),
    }
    
    all_present = True
    for name, value in credentials.items():
        if value:
            # Mask the value for security
            masked = value[:10] + "..." + value[-10:] if len(value) > 20 else "***"
            print(f"[OK] {name}: {masked}")
        else:
            print(f"[MISSING] {name}: MISSING")
            all_present = False
    
    print()
    return all_present

def test_oauth1_connection():
    """Test OAuth 1.0a connection (required for posting)."""
    print("=" * 60)
    print(" TESTING OAUTH 1.0a CONNECTION")
    print("=" * 60)
    
    try:
        client = tweepy.Client(
            consumer_key=os.getenv("TWITTER_API_KEY"),
            consumer_secret=os.getenv("TWITTER_API_SECRET"),
            access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
            access_token_secret=os.getenv("TWITTER_ACCESS_TOKEN_SECRET"),
        )
        
        # Try to get current user (verifies authentication)
        me = client.get_me()
        if me and me.data:
            print(f"[OK] Authentication successful!")
            print(f"   Username: @{me.data.username}")
            print(f"   User ID: {me.data.id}")
            print(f"   Name: {me.data.name}")
            return True, client
        else:
            print("[FAIL] Authentication failed: No user data returned")
            return False, None
            
    except tweepy.Unauthorized as e:
        print(f"[FAIL] Authentication failed: Unauthorized")
        print(f"   Error: {e}")
        print(f"\n[TIP] This usually means:")
        print(f"   - Invalid API Key or Secret")
        print(f"   - Invalid Access Token or Secret")
        print(f"   - Tokens don't match the API Key/Secret")
        return False, None
    except Exception as e:
        print(f"[FAIL] Connection error: {type(e).__name__}")
        print(f"   Error: {e}")
        return False, None

def test_bearer_token():
    """Test Bearer Token (app-only auth, read-only)."""
    print("\n" + "=" * 60)
    print(" TESTING BEARER TOKEN (App-only)")
    print("=" * 60)
    
    try:
        client = tweepy.Client(
            bearer_token=os.getenv("TWITTER_BEARER_TOKEN"),
        )
        
        # Try to search tweets (read-only operation)
        # This verifies the bearer token works
        response = client.search_recent_tweets(
            query="hello",
            max_results=10
        )
        
        if response:
            print("[OK] Bearer Token is valid!")
            print(f"   Can perform read operations")
            return True
        else:
            print("[FAIL] Bearer Token test failed")
            return False
            
    except Exception as e:
        print(f"[FAIL] Bearer Token error: {type(e).__name__}")
        print(f"   Error: {e}")
        return False

def test_tweet_capability(client):
    """Test if we can actually post a tweet."""
    print("\n" + "=" * 60)
    print(" TESTING TWEET POSTING CAPABILITY")
    print("=" * 60)
    
    if not client:
        print("[FAIL] No authenticated client available")
        return False
    
    try:
        # Try to create a test tweet
        test_tweet = "API Test - Please ignore this tweet. Testing X API integration."
        
        print(f"Attempting to post: {test_tweet}")
        response = client.create_tweet(text=test_tweet)
        
        if response and response.data:
            tweet_id = response.data['id']
            print(f"[OK] Tweet posted successfully!")
            print(f"   Tweet ID: {tweet_id}")
            print(f"   URL: https://twitter.com/i/web/status/{tweet_id}")
            
            # Try to delete the test tweet
            try:
                client.delete_tweet(tweet_id)
                print(f"[OK] Test tweet deleted successfully")
            except:
                print(f"[WARN] Could not delete test tweet (ID: {tweet_id})")
            
            return True
        else:
            print("[FAIL] Tweet creation failed: No data in response")
            return False
            
    except tweepy.Forbidden as e:
        print(f"[FAIL] Tweet posting forbidden")
        print(f"   Error: {e}")
        print(f"\n[TIP] This usually means:")
        print(f"   - Your app doesn't have write permissions")
        print(f"   - Go to X Developer Portal -> App Settings -> User authentication settings")
        print(f"   - Set App permissions to 'Read and write'")
        return False
    except Exception as e:
        print(f"[FAIL] Tweet posting error: {type(e).__name__}")
        print(f"   Error: {e}")
        return False

def main():
    print("\n" + "=" * 60)
    print("   X (TWITTER) API CONNECTIVITY TEST")
    print("=" * 60 + "\n")
    
    # Step 1: Check credentials
    if not test_credentials():
        print("\n[FAIL] Missing required credentials. Please check your .env file.")
        return 1
    
    # Step 2: Test OAuth 1.0a (for posting)
    oauth1_success, client = test_oauth1_connection()
    
    # Step 3: Test Bearer Token (for reading)
    bearer_success = test_bearer_token()
    
    # Step 4: Test tweet posting capability
    if oauth1_success and client:
        tweet_success = test_tweet_capability(client)
    else:
        tweet_success = False
    
    # Summary
    print("\n" + "=" * 60)
    print(" TEST SUMMARY")
    print("=" * 60)
    print(f"[{'OK' if oauth1_success else 'FAIL'}] OAuth 1.0a Authentication: {'PASS' if oauth1_success else 'FAIL'}")
    print(f"[{'OK' if bearer_success else 'FAIL'}] Bearer Token: {'PASS' if bearer_success else 'FAIL'}")
    print(f"[{'OK' if tweet_success else 'FAIL'}] Tweet Posting: {'PASS' if tweet_success else 'FAIL'}")
    
    if oauth1_success and tweet_success:
        print("\n[SUCCESS] All tests passed! X/Twitter publishing should work.")
        return 0
    else:
        print("\n[WARN] Some tests failed. See above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
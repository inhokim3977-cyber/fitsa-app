#!/usr/bin/env python3
"""
Test script for refit limit enforcement
Tests that users can only refit 5 times per hour with the same photos
"""
import os
import sys
import time
from services.credits_service import CreditsService

def test_refit_limit():
    """Test that refit limit (5 per hour) is enforced correctly"""
    
    # Create test database
    test_db = 'test_credits.db'
    if os.path.exists(test_db):
        os.remove(test_db)
    
    credits_service = CreditsService(db_path=test_db)
    
    # Test user
    test_ip = "192.168.1.100"
    test_ua = "Mozilla/5.0 Test Browser"
    test_hash = "test_photo_hash_12345"
    
    print("=== Testing Refit Limit Enforcement ===\n")
    
    # Step 1: First generation (should consume 1 free try)
    print("Step 1: First generation with new photos")
    allowed, info = credits_service.check_and_consume(test_ip, test_ua, test_hash)
    assert allowed == True, "First generation should be allowed"
    assert info['is_refitting'] == False, "First generation is not a refit"
    assert info['remaining_free'] == 2, f"Should have 2 free tries left, got {info['remaining_free']}"
    print(f"✓ First generation consumed 1 free try: {info}")
    print()
    
    # Step 2: Refit 5 times (should all succeed)
    print("Step 2: Refitting 5 times (should all succeed)")
    for i in range(1, 6):
        allowed, info = credits_service.check_and_consume(test_ip, test_ua, test_hash)
        assert allowed == True, f"Refit {i}/5 should be allowed"
        assert info['is_refitting'] == True, f"Should be detected as refitting"
        assert info.get('refit_count') == i, f"Refit count should be {i}, got {info.get('refit_count')}"
        print(f"✓ Refit {i}/5 succeeded: refit_count={info.get('refit_count')}")
    print()
    
    # Step 3: 6th refit (should FAIL due to limit)
    print("Step 3: 6th refit attempt (should be blocked)")
    allowed, info = credits_service.check_and_consume(test_ip, test_ua, test_hash)
    assert allowed == False, "6th refit should be blocked"
    assert info.get('refit_limit_exceeded') == True, "Should indicate refit limit exceeded"
    assert '재피팅 한도 초과' in info.get('error', ''), f"Error message missing: {info.get('error')}"
    print(f"✓ 6th refit correctly blocked: {info.get('error')}")
    print()
    
    # Step 4: Try with different photos (should reset counter and succeed)
    print("Step 4: Try with different photos (should reset counter)")
    new_hash = "different_photo_hash_67890"
    allowed, info = credits_service.check_and_consume(test_ip, test_ua, new_hash)
    assert allowed == True, "New photos should reset refit counter"
    assert info['is_refitting'] == False, "Different photos = not a refit"
    assert info['remaining_free'] == 1, f"Should have 1 free try left (consumed 2 total)"
    print(f"✓ Different photos reset counter: {info}")
    print()
    
    # Step 5: Add credits and verify refitting works with paid credits too
    print("Step 5: Add credits and verify refit limit applies to paid users too")
    user_key = credits_service.get_user_key(test_ip, test_ua)
    credits_service.add_credits(user_key, 10)
    
    # Use all free tries first
    allowed, info = credits_service.check_and_consume(test_ip, test_ua, "paid_user_hash")
    assert allowed == True and info['remaining_free'] == 0
    print(f"✓ Last free try consumed: {info}")
    
    # Now using paid credits - refit 5 times
    for i in range(1, 6):
        allowed, info = credits_service.check_and_consume(test_ip, test_ua, "paid_user_hash")
        assert allowed == True
        print(f"✓ Paid user refit {i}/5 succeeded")
    
    # 6th refit should fail even for paid users
    allowed, info = credits_service.check_and_consume(test_ip, test_ua, "paid_user_hash")
    assert allowed == False, "6th refit should be blocked even for paid users"
    assert info.get('refit_limit_exceeded') == True
    print(f"✓ Paid user 6th refit correctly blocked")
    print()
    
    # Cleanup
    os.remove(test_db)
    
    print("=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("=" * 50)
    print("\nRefit limit enforcement is working correctly:")
    print("- Users can refit up to 5 times per hour with same photos")
    print("- 6th refit is blocked with appropriate error message")
    print("- Changing photos resets the refit counter")
    print("- Limit applies to both free and paid users")

if __name__ == "__main__":
    try:
        test_refit_limit()
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

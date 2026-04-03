import pandas as pd
import sqlite3
import os

# 1. Yollları belirleme (Kodun proje klasörünün içinden çalıştırıldığı varsayılarak)
csv_file_path = 'AI_Module/heart_failure_clinical_records_dataset.csv'

# '..' ifadesi, AI_Module klasöründen çıkıp database klasörüne girileceği anlamına gelir.
db_file_path = 'database/HeartFailure_DB.db' 

try:
    # Bağlantı kurmaya çalışmadan önce klasörün varlığını kontrol etme.
    if not os.path.exists('database'):
        print("UYARI: 'database' klasörü bu yolda mevcut değil!")
    
    # 2. CSV dosyasını okuma
    df = pd.read_csv(csv_file_path)
    print("CSV dosyasi başariyla okundu.")

    conn = sqlite3.connect(db_file_path)
    print(f"Veritabanina şurada başariyla bağlanildi: {db_file_path}")

    # 3. Tablo adını belirleme
    table_name = 'heart_failure_records'
    
    # 4. Veri enjeksiyonu (أو Veri aktarma)
    df.to_sql(table_name, conn, if_exists='replace', index=False)
    
    print(f"Başariyla tamamlandi! Veriler artik tablonun içindeki yeni klasöründe.'{table_name}'.")

except FileNotFoundError:
    print(f"HATA: CSV dosyasi şu yolda bulunamadi: {csv_file_path}")
except Exception as e:
    print(f"Bir hata oluştu: {e}")

finally:
    if 'conn' in locals():
        conn.close()
        print("🔒 Bağlanti kapatildi.")